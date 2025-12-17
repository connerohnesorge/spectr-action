/**
 * GitHub API integration for PR comments
 *
 * Handles creating, updating, and finding PR impact comments
 */

import { Octokit } from "@octokit/core";
import { paginateRest } from "@octokit/plugin-paginate-rest";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import type { RepoContext } from "../issues/types";
import { PR_IMPACT_MARKER_PATTERN } from "./types";

// Create Octokit with plugins
const ExtendedOctokit = Octokit.plugin(paginateRest, restEndpointMethods);
export type OctokitClient = InstanceType<typeof ExtendedOctokit>;

/**
 * Existing comment info
 */
export interface ExistingComment {
  id: number;
  body: string;
}

/**
 * Create an authenticated Octokit client
 */
export function createOctokitClient(token: string): OctokitClient {
  return new ExtendedOctokit({ auth: token });
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

/**
 * Find an existing PR impact comment by marker
 * @param octokit - Authenticated Octokit client
 * @param repo - Repository context
 * @param prNumber - PR number
 * @param changeId - Change ID to search for
 * @returns Existing comment info or null if not found
 */
export async function findImpactComment(
  octokit: OctokitClient,
  repo: RepoContext,
  prNumber: number,
  changeId: string,
): Promise<ExistingComment | null> {
  // Get all comments on the PR
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    issue_number: prNumber,
    owner: repo.owner,
    per_page: 100,
    repo: repo.repo,
  });

  // Look for our marker
  const markerPattern = new RegExp(
    `<!--\\s*spectr-pr-impact:${changeId}\\s*-->`,
  );

  for (const comment of comments) {
    if (comment.body && markerPattern.test(comment.body)) {
      return {
        body: comment.body,
        id: comment.id,
      };
    }
  }

  return null;
}

/**
 * Find any existing PR impact comment (regardless of change ID)
 * @param octokit - Authenticated Octokit client
 * @param repo - Repository context
 * @param prNumber - PR number
 * @returns Existing comment info with change ID, or null if not found
 */
export async function findAnyImpactComment(
  octokit: OctokitClient,
  repo: RepoContext,
  prNumber: number,
): Promise<(ExistingComment & { changeId: string }) | null> {
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    issue_number: prNumber,
    owner: repo.owner,
    per_page: 100,
    repo: repo.repo,
  });

  for (const comment of comments) {
    if (comment.body) {
      const match = comment.body.match(PR_IMPACT_MARKER_PATTERN);
      if (match) {
        return {
          body: comment.body,
          changeId: match[1],
          id: comment.id,
        };
      }
    }
  }

  return null;
}

/**
 * Create a new PR comment
 * @param octokit - Authenticated Octokit client
 * @param repo - Repository context
 * @param prNumber - PR number
 * @param body - Comment body
 * @returns Created comment ID and URL
 */
export async function createPRComment(
  octokit: OctokitClient,
  repo: RepoContext,
  prNumber: number,
  body: string,
): Promise<{ id: number; url: string }> {
  const response = await octokit.rest.issues.createComment({
    body,
    issue_number: prNumber,
    owner: repo.owner,
    repo: repo.repo,
  });

  return {
    id: response.data.id,
    url: response.data.html_url,
  };
}

/**
 * Update an existing PR comment
 * @param octokit - Authenticated Octokit client
 * @param repo - Repository context
 * @param commentId - Comment ID to update
 * @param body - New comment body
 * @returns Updated comment URL
 */
export async function updatePRComment(
  octokit: OctokitClient,
  repo: RepoContext,
  commentId: number,
  body: string,
): Promise<string> {
  const response = await octokit.rest.issues.updateComment({
    body,
    comment_id: commentId,
    owner: repo.owner,
    repo: repo.repo,
  });

  return response.data.html_url;
}
