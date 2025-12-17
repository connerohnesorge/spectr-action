/**
 * PR Impact feature main module
 *
 * Orchestrates detection, calculation, formatting, and commenting
 */

import * as core from "@actions/core";
import { calculateSpecImpact } from "./calculate";
import {
  createOctokitClient,
  createPRComment,
  findImpactComment,
  getRepoContext,
  updatePRComment,
} from "./comment";
import { detectPRContext } from "./detect";
import { commentsMatch, formatPRComment } from "./format";
import type { PRImpactConfig, PRImpactResult } from "./types";

/**
 * Run the PR impact feature
 *
 * 1. Detects if running on a spectr PR
 * 2. Calculates spec impact from delta specs
 * 3. Creates or updates a PR comment with the impact
 *
 * @param config - PR impact configuration
 * @param workspacePath - Root workspace path
 * @returns Result of the operation
 */
export async function runPRImpact(
  config: PRImpactConfig,
  workspacePath: string,
): Promise<PRImpactResult> {
  // Default result for when we don't run
  const defaultResult: PRImpactResult = {
    changeId: null,
    commentCreated: false,
    commentUpdated: false,
    commentUrl: null,
    mode: null,
    ran: false,
  };

  // 1. Detect PR context
  const prContext = detectPRContext();

  if (!prContext.isPR) {
    core.info("Not running on a pull request event");
    return defaultResult;
  }

  if (!prContext.isSpectrPR) {
    core.info(`Not a spectr PR branch: ${prContext.branchName || "unknown"}`);
    return defaultResult;
  }

  if (!prContext.prNumber) {
    core.warning("Could not determine PR number from event");
    return defaultResult;
  }

  if (!prContext.changeId || !prContext.mode) {
    core.warning("Could not extract change ID or mode from branch name");
    return defaultResult;
  }

  core.info(`Detected spectr PR: ${prContext.mode}/${prContext.changeId}`);
  core.info(`PR number: ${prContext.prNumber}`);

  // 2. Calculate spec impact
  core.info("Calculating spec impact...");
  const impact = await calculateSpecImpact(
    prContext.changeId,
    workspacePath,
    prContext.mode,
  );

  core.info(
    `Found ${impact.counts.total} spec changes across ${impact.capabilities.length} capabilities`,
  );
  core.info(`  Added: ${impact.counts.added}`);
  core.info(`  Modified: ${impact.counts.modified}`);
  core.info(`  Removed: ${impact.counts.removed}`);
  core.info(`  Renamed: ${impact.counts.renamed}`);
  core.info(`  Archived: ${impact.isArchived ? "Yes" : "No"}`);

  // 3. Format PR comment
  const commentBody = formatPRComment(impact);

  // 4. Create or update comment
  const octokit = createOctokitClient(config.githubToken);
  const repo = getRepoContext();

  let commentCreated = false;
  let commentUpdated = false;
  let commentUrl: string | null = null;

  // Check for existing comment
  const existingComment = await findImpactComment(
    octokit,
    repo,
    prContext.prNumber,
    prContext.changeId,
  );

  if (existingComment) {
    // Check if update is needed
    if (config.updateComment) {
      if (!commentsMatch(existingComment.body, commentBody)) {
        core.info("Updating existing PR impact comment...");
        commentUrl = await updatePRComment(
          octokit,
          repo,
          existingComment.id,
          commentBody,
        );
        commentUpdated = true;
        core.info(`Updated comment: ${commentUrl}`);
      } else {
        core.info("Existing comment is up to date, skipping update");
        // Get the URL from the API since we don't have it cached
        commentUrl = `https://github.com/${repo.owner}/${repo.repo}/pull/${prContext.prNumber}#issuecomment-${existingComment.id}`;
      }
    } else {
      core.info(
        "Existing comment found but updateComment is disabled, creating new comment",
      );
      const result = await createPRComment(
        octokit,
        repo,
        prContext.prNumber,
        commentBody,
      );
      commentUrl = result.url;
      commentCreated = true;
      core.info(`Created comment: ${commentUrl}`);
    }
  } else {
    // Create new comment
    core.info("Creating new PR impact comment...");
    const result = await createPRComment(
      octokit,
      repo,
      prContext.prNumber,
      commentBody,
    );
    commentUrl = result.url;
    commentCreated = true;
    core.info(`Created comment: ${commentUrl}`);
  }

  return {
    changeId: prContext.changeId,
    commentCreated,
    commentUpdated,
    commentUrl,
    mode: prContext.mode,
    ran: true,
  };
}

// Re-export types for convenience
export type { PRImpactConfig, PRImpactResult } from "./types";
