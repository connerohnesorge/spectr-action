/**
 * GitHub API integration module for issue sync
 *
 * Handles creating, updating, and closing issues via the GitHub API
 */

import { Octokit } from "@octokit/core";
import { paginateRest } from "@octokit/plugin-paginate-rest";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import type { IssueSyncConfig, ManagedIssue, RepoContext } from "./types";
import { extractChangeIdFromBody } from "./types";

// Create Octokit with plugins
const ExtendedOctokit = Octokit.plugin(paginateRest, restEndpointMethods);
type OctokitClient = InstanceType<typeof ExtendedOctokit>;

/**
 * Create an authenticated Octokit client
 */
export function createOctokitClient(token: string): OctokitClient {
  return new ExtendedOctokit({ auth: token });
}

/**
 * Find all issues managed by Spectr in the repository
 * @param octokit - Authenticated Octokit client
 * @param repo - Repository context
 * @param spectrLabel - Label used to identify Spectr-managed issues
 * @returns Array of managed issues
 */
export async function findManagedIssues(
  octokit: OctokitClient,
  repo: RepoContext,
  spectrLabel: string,
): Promise<ManagedIssue[]> {
  // Search for issues with the spectr label (both open and closed)
  const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
    labels: spectrLabel,
    owner: repo.owner,
    per_page: 100,
    repo: repo.repo,
    state: "all",
  });

  const managedIssues: ManagedIssue[] = [];

  for (const issue of issues) {
    // Skip pull requests (they also appear in the issues API)
    if (issue.pull_request) {
      continue;
    }

    const changeId = extractChangeIdFromBody(issue.body || "");
    if (changeId) {
      managedIssues.push({
        body: issue.body || "",
        changeId,
        number: issue.number,
        state: issue.state as "open" | "closed",
        title: issue.title,
      });
    }
  }

  return managedIssues;
}

/**
 * Create a new issue for a change proposal
 * @param octokit - Authenticated Octokit client
 * @param repo - Repository context
 * @param title - Issue title
 * @param body - Issue body
 * @param labels - Labels to apply
 * @returns Created issue number
 */
export async function createIssue(
  octokit: OctokitClient,
  repo: RepoContext,
  title: string,
  body: string,
  labels: string[],
): Promise<number> {
  const response = await octokit.rest.issues.create({
    body,
    labels,
    owner: repo.owner,
    repo: repo.repo,
    title,
  });

  return response.data.number;
}

/**
 * Update an existing issue
 * @param octokit - Authenticated Octokit client
 * @param repo - Repository context
 * @param issueNumber - Issue number to update
 * @param title - New issue title
 * @param body - New issue body
 * @param labels - Labels to set
 */
export async function updateIssue(
  octokit: OctokitClient,
  repo: RepoContext,
  issueNumber: number,
  title: string,
  body: string,
  labels: string[],
): Promise<void> {
  await octokit.rest.issues.update({
    body,
    issue_number: issueNumber,
    labels,
    owner: repo.owner,
    repo: repo.repo,
    title,
  });
}

/**
 * Close an issue (for archived changes)
 * @param octokit - Authenticated Octokit client
 * @param repo - Repository context
 * @param issueNumber - Issue number to close
 * @param comment - Optional comment to add before closing
 */
export async function closeIssue(
  octokit: OctokitClient,
  repo: RepoContext,
  issueNumber: number,
  comment?: string,
): Promise<void> {
  // Add optional closing comment
  if (comment) {
    await octokit.rest.issues.createComment({
      body: comment,
      issue_number: issueNumber,
      owner: repo.owner,
      repo: repo.repo,
    });
  }

  await octokit.rest.issues.update({
    issue_number: issueNumber,
    owner: repo.owner,
    repo: repo.repo,
    state: "closed",
    state_reason: "completed",
  });
}

/**
 * Reopen a closed issue (for unarchived changes)
 * @param octokit - Authenticated Octokit client
 * @param repo - Repository context
 * @param issueNumber - Issue number to reopen
 */
export async function reopenIssue(
  octokit: OctokitClient,
  repo: RepoContext,
  issueNumber: number,
): Promise<void> {
  await octokit.rest.issues.update({
    issue_number: issueNumber,
    owner: repo.owner,
    repo: repo.repo,
    state: "open",
  });
}

/**
 * Ensure required labels exist in the repository
 * Creates labels if they don't exist
 * @param octokit - Authenticated Octokit client
 * @param repo - Repository context
 * @param config - Issue sync configuration
 */
export async function ensureLabelsExist(
  octokit: OctokitClient,
  repo: RepoContext,
  config: IssueSyncConfig,
): Promise<void> {
  // Combine all required labels
  const requiredLabels = [...config.labels];
  if (!requiredLabels.includes(config.spectrLabel)) {
    requiredLabels.push(config.spectrLabel);
  }

  // Get existing labels
  const existingLabels = await octokit.paginate(
    octokit.rest.issues.listLabelsForRepo,
    {
      owner: repo.owner,
      per_page: 100,
      repo: repo.repo,
    },
  );

  const existingLabelNames = new Set(
    existingLabels.map((label) => label.name.toLowerCase()),
  );

  // Create missing labels
  for (const labelName of requiredLabels) {
    if (!existingLabelNames.has(labelName.toLowerCase())) {
      try {
        await octokit.rest.issues.createLabel({
          color: getLabelColor(labelName),
          description: getLabelDescription(labelName),
          name: labelName,
          owner: repo.owner,
          repo: repo.repo,
        });
      } catch (error) {
        // Label might have been created by another process, ignore 422 errors
        if ((error as { status?: number }).status !== 422) {
          throw error;
        }
      }
    }
  }
}

/**
 * Get color for a label based on its name
 */
function getLabelColor(labelName: string): string {
  const colors: Record<string, string> = {
    "change-proposal": "1D76DB",
    spectr: "7B68EE",
    "spectr-managed": "5319E7",
  };
  return colors[labelName.toLowerCase()] || "EDEDED";
}

/**
 * Get description for a label based on its name
 */
function getLabelDescription(labelName: string): string {
  const descriptions: Record<string, string> = {
    "change-proposal": "A change proposal tracked by Spectr",
    spectr: "Related to Spectr spec-driven development",
    "spectr-managed": "Issue managed by Spectr action",
  };
  return descriptions[labelName.toLowerCase()] || "";
}

/**
 * Get repository context from environment
 */
export function getRepoContext(): RepoContext {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) {
    throw new Error("GITHUB_REPOSITORY environment variable is not set");
  }

  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY format: ${repository}`);
  }

  return { owner, repo };
}
