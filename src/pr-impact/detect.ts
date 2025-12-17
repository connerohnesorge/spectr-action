/**
 * PR detection module for spectr PR impact feature
 *
 * Detects if running on a spectr PR and extracts relevant context
 */

import * as fs from "node:fs";
import type { PRContext, PRMode } from "./types";

/**
 * Spectr branch pattern
 * Matches: spectr/proposal/<change-id>, spectr/archive/<change-id>, spectr/remove/<change-id>
 */
const SPECTR_BRANCH_PATTERN = /^spectr\/(proposal|archive|remove)\/(.+)$/;

/**
 * Parse a branch name to extract spectr PR information
 * @param branchName - The branch name to parse
 * @returns Parsed branch info
 */
export function parseSpectrBranch(branchName: string): {
  isSpectrBranch: boolean;
  mode: PRMode | null;
  changeId: string | null;
} {
  const match = branchName.match(SPECTR_BRANCH_PATTERN);

  if (!match) {
    return {
      changeId: null,
      isSpectrBranch: false,
      mode: null,
    };
  }

  return {
    changeId: match[2],
    isSpectrBranch: true,
    mode: match[1] as PRMode,
  };
}

/**
 * Get PR number from GitHub event payload
 * @returns PR number or null if not found
 */
export function getPRNumberFromEvent(): number | null {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    return null;
  }

  try {
    const eventData = JSON.parse(fs.readFileSync(eventPath, "utf-8"));

    // For pull_request events, the PR number is in the payload
    if (eventData.pull_request?.number) {
      return eventData.pull_request.number;
    }

    // For issue_comment or other PR-related events
    if (eventData.issue?.pull_request && eventData.issue?.number) {
      return eventData.issue.number;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get the head branch name for the current PR
 * @returns Branch name or null if not found
 */
export function getHeadBranchName(): string | null {
  // GITHUB_HEAD_REF is set for pull_request events
  const headRef = process.env.GITHUB_HEAD_REF;
  if (headRef) {
    return headRef;
  }

  // For push events, we can try to parse from GITHUB_REF
  // Format: refs/heads/<branch-name>
  const ref = process.env.GITHUB_REF;
  if (ref?.startsWith("refs/heads/")) {
    return ref.replace("refs/heads/", "");
  }

  // Try to read from event payload
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath) {
    try {
      const eventData = JSON.parse(fs.readFileSync(eventPath, "utf-8"));
      if (eventData.pull_request?.head?.ref) {
        return eventData.pull_request.head.ref;
      }
    } catch {
      // Ignore parse errors
    }
  }

  return null;
}

/**
 * Check if running on a pull request event
 * @returns true if this is a PR event
 */
export function isPullRequestEvent(): boolean {
  const eventName = process.env.GITHUB_EVENT_NAME;
  return (
    eventName === "pull_request" ||
    eventName === "pull_request_target" ||
    eventName === "pull_request_review" ||
    eventName === "pull_request_review_comment"
  );
}

/**
 * Detect PR context from GitHub Actions environment
 * @returns Full PR context with all detected information
 */
export function detectPRContext(): PRContext {
  const isPR = isPullRequestEvent();
  const branchName = getHeadBranchName();
  const prNumber = getPRNumberFromEvent();

  // Default context for non-PR events
  if (!isPR || !branchName) {
    return {
      branchName,
      changeId: null,
      isPR,
      isSpectrPR: false,
      mode: null,
      prNumber,
    };
  }

  // Parse the branch name to check if it's a spectr PR
  const branchInfo = parseSpectrBranch(branchName);

  return {
    branchName,
    changeId: branchInfo.changeId,
    isPR,
    isSpectrPR: branchInfo.isSpectrBranch,
    mode: branchInfo.mode,
    prNumber,
  };
}
