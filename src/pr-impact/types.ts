/**
 * TypeScript type definitions for PR spec impact feature
 */

/**
 * Configuration for PR impact comment behavior
 */
export interface PRImpactConfig {
  /** Enable PR impact comment feature */
  enabled: boolean;
  /** GitHub token for API access */
  githubToken: string;
  /** Update existing comment instead of creating new */
  updateComment: boolean;
}

/**
 * PR mode determined from branch name
 */
export type PRMode = "proposal" | "archive" | "remove";

/**
 * Detected PR context from GitHub Actions environment
 */
export interface PRContext {
  /** Whether running on a pull request event */
  isPR: boolean;
  /** Whether the PR is from a spectr branch */
  isSpectrPR: boolean;
  /** PR number (if on a PR) */
  prNumber: number | null;
  /** Head branch name */
  branchName: string | null;
  /** Change ID extracted from branch name */
  changeId: string | null;
  /** PR mode (proposal, archive, remove) */
  mode: PRMode | null;
}

/**
 * A single spec change (add/modify/remove/rename)
 */
export interface SpecChange {
  /** Capability name (directory under specs/) */
  capabilityName: string;
  /** Type of operation */
  operation: "add" | "modify" | "remove" | "rename";
  /** Requirement name */
  requirementName: string;
  /** Full requirement content (for add/modify) */
  content?: string;
  /** Original name (for renames) */
  oldName?: string;
}

/**
 * Full impact summary for a change
 */
export interface SpecImpact {
  /** Change ID */
  changeId: string;
  /** PR mode */
  mode: PRMode;
  /** Whether the change is archived */
  isArchived: boolean;
  /** List of affected capability names */
  capabilities: string[];
  /** All spec changes */
  changes: SpecChange[];
  /** Operation counts */
  counts: OperationCounts;
}

/**
 * Operation counts for summary
 */
export interface OperationCounts {
  added: number;
  modified: number;
  removed: number;
  renamed: number;
  total: number;
}

/**
 * Result of the PR impact operation
 */
export interface PRImpactResult {
  /** Whether the feature ran (false if not on spectr PR) */
  ran: boolean;
  /** Detected change ID */
  changeId: string | null;
  /** Detected PR mode */
  mode: PRMode | null;
  /** Whether a new comment was created */
  commentCreated: boolean;
  /** Whether an existing comment was updated */
  commentUpdated: boolean;
  /** URL to the comment (if created/updated) */
  commentUrl: string | null;
}

/**
 * Marker comment pattern for identifying PR impact comments
 * Format: <!-- spectr-pr-impact:CHANGE_ID -->
 */
export const PR_IMPACT_MARKER_PATTERN =
  /<!--\s*spectr-pr-impact:([a-zA-Z0-9_-]+)\s*-->/;

/**
 * Maximum comment body length (GitHub limit)
 */
export const MAX_COMMENT_BODY_LENGTH = 65536;

/**
 * Generate the marker comment for a change ID
 */
export function generatePRImpactMarker(changeId: string): string {
  return `<!-- spectr-pr-impact:${changeId} -->`;
}

/**
 * Extract change ID from comment body using marker pattern
 */
export function extractChangeIdFromComment(body: string): string | null {
  const match = body.match(PR_IMPACT_MARKER_PATTERN);
  return match ? match[1] : null;
}
