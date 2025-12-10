/**
 * Issue formatting module
 *
 * Generates issue titles and bodies from change proposal content
 */

import type { ChangeProposal, IssueSyncConfig } from "./types";
import {
  CHANGE_ID_MARKER_PATTERN,
  generateChangeIdMarker,
  MAX_ISSUE_BODY_LENGTH,
} from "./types";

const TRUNCATION_NOTICE =
  "\n\n---\n*This content has been truncated due to GitHub issue size limits. See the full proposal in the repository.*";

/**
 * Format issue title from change ID and configuration
 * @param changeId - The change ID
 * @param config - Issue sync configuration
 * @returns Formatted issue title
 */
export function formatIssueTitle(
  changeId: string,
  config: IssueSyncConfig,
): string {
  return `${config.titlePrefix} ${changeId}`;
}

/**
 * Format issue body from change proposal content
 * Includes hidden marker, proposal content, affected specs, and tasks
 * @param proposal - The change proposal
 * @returns Formatted issue body
 */
export function formatIssueBody(proposal: ChangeProposal): string {
  const parts: string[] = [];

  // Hidden marker for issue-to-change mapping (always first)
  parts.push(generateChangeIdMarker(proposal.id));
  parts.push("");

  // Proposal content
  parts.push("## Proposal");
  parts.push("");
  parts.push(proposal.proposalContent.trim());
  parts.push("");

  // Affected specs section (if any)
  if (proposal.affectedSpecs.length > 0) {
    parts.push("## Affected Specs");
    parts.push("");
    for (const spec of proposal.affectedSpecs) {
      parts.push(`- \`${spec}\``);
    }
    parts.push("");
  }

  // Tasks section (if present)
  if (proposal.tasksContent) {
    parts.push("## Tasks");
    parts.push("");
    parts.push(proposal.tasksContent.trim());
    parts.push("");
  }

  // Footer
  parts.push("---");
  parts.push(
    "*This issue is managed by [Spectr](https://github.com/connerohnesorge/spectr). Changes to the proposal will be reflected here automatically.*",
  );

  const body = parts.join("\n");

  // Handle body truncation if needed
  return truncateBody(body);
}

/**
 * Truncate issue body if it exceeds GitHub's limit
 * @param body - Original issue body
 * @returns Truncated body if needed
 */
function truncateBody(body: string): string {
  if (body.length <= MAX_ISSUE_BODY_LENGTH) {
    return body;
  }

  // Calculate max content length accounting for truncation notice
  const maxContentLength = MAX_ISSUE_BODY_LENGTH - TRUNCATION_NOTICE.length;

  // Truncate at a reasonable point (try to end at a newline)
  let truncatedBody = body.substring(0, maxContentLength);
  const lastNewline = truncatedBody.lastIndexOf("\n");
  if (lastNewline > maxContentLength * 0.8) {
    truncatedBody = truncatedBody.substring(0, lastNewline);
  }

  return truncatedBody + TRUNCATION_NOTICE;
}

/**
 * Extract change ID from issue body marker
 * @param body - Issue body content
 * @returns Change ID or null if not found
 */
export function extractChangeId(body: string): string | null {
  const match = body.match(CHANGE_ID_MARKER_PATTERN);
  return match ? match[1] : null;
}

/**
 * Check if two issue bodies have the same content (ignoring whitespace differences)
 * Used to determine if an update is needed
 * @param existing - Existing issue body
 * @param updated - New issue body
 * @returns true if content is effectively the same
 */
export function bodiesMatch(existing: string, updated: string): boolean {
  // Normalize whitespace for comparison
  const normalize = (s: string) =>
    s.replace(/\r\n/g, "\n").replace(/\s+$/gm, "").trim();
  return normalize(existing) === normalize(updated);
}
