/**
 * TypeScript type definitions for GitHub Issues sync feature
 */

/**
 * Configuration for issue sync behavior
 */
export interface IssueSyncConfig {
  /** Enable issue sync feature */
  enabled: boolean;
  /** Labels to apply to synced issues (comma-separated in input) */
  labels: string[];
  /** Prefix for issue titles */
  titlePrefix: string;
  /** Close issues when changes are archived */
  closeOnArchive: boolean;
  /** Update existing issues when proposal changes */
  updateExisting: boolean;
  /** Label used to identify Spectr-managed issues */
  spectrLabel: string;
  /** GitHub token for API access */
  githubToken: string;
}

/**
 * Represents a change proposal discovered in the filesystem
 */
export interface ChangeProposal {
  /** Change ID (directory name under spectr/changes/) */
  id: string;
  /** Full path to the change directory */
  path: string;
  /** Content of proposal.md */
  proposalContent: string;
  /** Content of tasks.md (optional) */
  tasksContent?: string;
  /** List of affected spec names (from specs/ subdirectory) */
  affectedSpecs: string[];
  /** Whether the change is archived */
  isArchived: boolean;
}

/**
 * Result of the issue sync operation
 */
export interface SyncResult {
  /** Number of issues created */
  created: number;
  /** Number of issues updated */
  updated: number;
  /** Number of issues closed */
  closed: number;
  /** Total number of active changes discovered */
  totalChanges: number;
  /** Details of any errors encountered */
  errors: SyncError[];
}

/**
 * Error encountered during sync
 */
export interface SyncError {
  /** Change ID that caused the error */
  changeId: string;
  /** Error message */
  message: string;
  /** Whether the error is recoverable */
  recoverable: boolean;
}

/**
 * Represents a GitHub Issue managed by Spectr
 */
export interface ManagedIssue {
  /** GitHub issue number */
  number: number;
  /** Change ID extracted from issue body marker */
  changeId: string;
  /** Current issue state */
  state: "open" | "closed";
  /** Issue title */
  title: string;
  /** Issue body */
  body: string;
}

/**
 * GitHub repository context
 */
export interface RepoContext {
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
}

/**
 * Marker comment format for linking issues to changes
 * Format: <!-- spectr-change-id:CHANGE_ID -->
 */
export const CHANGE_ID_MARKER_PATTERN =
  /<!--\s*spectr-change-id:([a-zA-Z0-9_-]+)\s*-->/;

/**
 * Maximum issue body length (GitHub limit)
 */
export const MAX_ISSUE_BODY_LENGTH = 65536;

/**
 * Generate the marker comment for a change ID
 */
export function generateChangeIdMarker(changeId: string): string {
  return `<!-- spectr-change-id:${changeId} -->`;
}

/**
 * Extract change ID from issue body using marker pattern
 */
export function extractChangeIdFromBody(body: string): string | null {
  const match = body.match(CHANGE_ID_MARKER_PATTERN);
  return match ? match[1] : null;
}
