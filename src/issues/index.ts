/**
 * Issue sync orchestration module
 *
 * Main entry point for the GitHub Issues sync feature
 */

import * as core from "@actions/core";
import { discoverActiveChanges, discoverArchivedChanges } from "./discover";
import { bodiesMatch, formatIssueBody, formatIssueTitle } from "./format";
import {
  closeIssue,
  createIssue,
  createOctokitClient,
  ensureLabelsExist,
  findManagedIssues,
  getRepoContext,
  reopenIssue,
  updateIssue,
} from "./sync";
import type {
  ChangeProposal,
  IssueSyncConfig,
  ManagedIssue,
  SyncResult,
} from "./types";

/**
 * Main entry point for issue sync
 * Discovers changes, syncs with GitHub Issues, and returns results
 * @param config - Issue sync configuration
 * @param workspacePath - Root path of the repository
 * @returns Sync results
 */
export async function syncIssues(
  config: IssueSyncConfig,
  workspacePath: string,
): Promise<SyncResult> {
  const result: SyncResult = {
    closed: 0,
    created: 0,
    errors: [],
    totalChanges: 0,
    updated: 0,
  };

  if (!config.enabled) {
    core.info("Issue sync is disabled");
    return result;
  }

  if (!config.githubToken) {
    throw new Error(
      "GitHub token is required for issue sync. Please provide the github-token input.",
    );
  }

  core.info("Starting issue sync...");

  // Setup GitHub API client and repo context
  const octokit = createOctokitClient(config.githubToken);
  const repo = getRepoContext();

  core.info(`Repository: ${repo.owner}/${repo.repo}`);

  // Ensure required labels exist
  core.info("Ensuring labels exist...");
  await ensureLabelsExist(octokit, repo, config);

  // Discover all changes
  core.info("Discovering change proposals...");
  const activeChanges = await discoverActiveChanges(workspacePath);
  const archivedChanges = config.closeOnArchive
    ? await discoverArchivedChanges(workspacePath)
    : [];

  result.totalChanges = activeChanges.length;
  core.info(`Found ${activeChanges.length} active changes`);
  if (archivedChanges.length > 0) {
    core.info(`Found ${archivedChanges.length} archived changes`);
  }

  // Find existing managed issues
  core.info("Finding existing managed issues...");
  const managedIssues = await findManagedIssues(
    octokit,
    repo,
    config.spectrLabel,
  );
  core.info(`Found ${managedIssues.length} existing managed issues`);

  // Build a map of change ID to managed issue
  const issueMap = new Map<string, ManagedIssue>();
  for (const issue of managedIssues) {
    issueMap.set(issue.changeId, issue);
  }

  // Get all labels to apply (user-specified + spectr-managed)
  const allLabels = [...config.labels];
  if (!allLabels.includes(config.spectrLabel)) {
    allLabels.push(config.spectrLabel);
  }

  // Process active changes
  for (const change of activeChanges) {
    try {
      const syncResult = await syncActiveChange(
        octokit,
        repo,
        change,
        config,
        allLabels,
        issueMap.get(change.id),
      );

      if (syncResult === "created") {
        result.created++;
      } else if (syncResult === "updated") {
        result.updated++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      core.warning(`Failed to sync change ${change.id}: ${message}`);
      result.errors.push({
        changeId: change.id,
        message,
        recoverable: true,
      });
    }
  }

  // Process archived changes (close their issues)
  if (config.closeOnArchive) {
    for (const change of archivedChanges) {
      const existingIssue = issueMap.get(change.id);
      if (existingIssue && existingIssue.state === "open") {
        try {
          await closeIssue(
            octokit,
            repo,
            existingIssue.number,
            `This change has been archived. Closing the tracking issue.`,
          );
          result.closed++;
          core.info(
            `Closed issue #${existingIssue.number} for archived change ${change.id}`,
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          core.warning(
            `Failed to close issue for archived change ${change.id}: ${message}`,
          );
          result.errors.push({
            changeId: change.id,
            message,
            recoverable: true,
          });
        }
      }
    }
  }

  // Log summary
  core.info("=== Issue Sync Summary ===");
  core.info(`Created: ${result.created}`);
  core.info(`Updated: ${result.updated}`);
  core.info(`Closed: ${result.closed}`);
  core.info(`Total active changes: ${result.totalChanges}`);
  if (result.errors.length > 0) {
    core.warning(`Errors encountered: ${result.errors.length}`);
  }

  return result;
}

/**
 * Sync a single active change with GitHub Issues
 * @returns "created", "updated", or "skipped"
 */
async function syncActiveChange(
  octokit: ReturnType<typeof createOctokitClient>,
  repo: { owner: string; repo: string },
  change: ChangeProposal,
  config: IssueSyncConfig,
  labels: string[],
  existingIssue?: ManagedIssue,
): Promise<"created" | "updated" | "skipped"> {
  const title = formatIssueTitle(change.id, config);
  const body = formatIssueBody(change);

  if (!existingIssue) {
    // Create new issue
    const issueNumber = await createIssue(octokit, repo, title, body, labels);
    core.info(`Created issue #${issueNumber} for change ${change.id}`);
    return "created";
  }

  // Issue exists - check if update needed
  if (!config.updateExisting) {
    core.debug(
      `Skipping update for change ${change.id} (update-existing is false)`,
    );
    return "skipped";
  }

  // Check if issue was closed but change is now active
  if (existingIssue.state === "closed") {
    await reopenIssue(octokit, repo, existingIssue.number);
    await updateIssue(octokit, repo, existingIssue.number, title, body, labels);
    core.info(
      `Reopened and updated issue #${existingIssue.number} for change ${change.id}`,
    );
    return "updated";
  }

  // Check if content has changed
  if (bodiesMatch(existingIssue.body, body) && existingIssue.title === title) {
    core.debug(`No changes for issue #${existingIssue.number} (${change.id})`);
    return "skipped";
  }

  // Update the issue
  await updateIssue(octokit, repo, existingIssue.number, title, body, labels);
  core.info(`Updated issue #${existingIssue.number} for change ${change.id}`);
  return "updated";
}

// Re-export types for convenience
export type { IssueSyncConfig, SyncResult } from "./types";
