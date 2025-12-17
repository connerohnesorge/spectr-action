/**
 * PR comment formatting module
 *
 * Formats spec impact information as Markdown for PR comments
 */

import type { OperationCounts, SpecChange, SpecImpact } from "./types";
import { generatePRImpactMarker, MAX_COMMENT_BODY_LENGTH } from "./types";

/**
 * Format operation counts as a summary table
 */
export function formatSummaryTable(counts: OperationCounts): string {
  const lines = [
    "| Operation | Count |",
    "|-----------|-------|",
    `| Added | ${counts.added} |`,
    `| Modified | ${counts.modified} |`,
    `| Removed | ${counts.removed} |`,
    `| Renamed | ${counts.renamed} |`,
  ];

  return lines.join("\n");
}

/**
 * Format the status table with mode and archive status
 */
function formatStatusTable(impact: SpecImpact): string {
  const archiveStatus = impact.isArchived ? "Yes" : "No";
  const modeDisplay =
    impact.mode.charAt(0).toUpperCase() + impact.mode.slice(1);

  const lines = [
    "| Status | Value |",
    "|--------|-------|",
    `| Mode | ${modeDisplay} |`,
    `| Archived | ${archiveStatus} |`,
  ];

  return lines.join("\n");
}

/**
 * Format affected capabilities list
 */
function formatCapabilitiesList(impact: SpecImpact): string {
  if (impact.capabilities.length === 0) {
    return "_No capabilities affected_";
  }

  // Count changes per capability
  const changeCounts = new Map<string, number>();
  for (const change of impact.changes) {
    const count = changeCounts.get(change.capabilityName) || 0;
    changeCounts.set(change.capabilityName, count + 1);
  }

  const lines: string[] = [];
  for (const capability of impact.capabilities) {
    const count = changeCounts.get(capability) || 0;
    const plural = count === 1 ? "change" : "changes";
    lines.push(`- \`${capability}\` - ${count} ${plural}`);
  }

  return lines.join("\n");
}

/**
 * Format changes for a single capability as a collapsible section
 */
function formatCapabilityChanges(
  capabilityName: string,
  changes: SpecChange[],
): string {
  const capabilityChanges = changes.filter(
    (c) => c.capabilityName === capabilityName,
  );

  if (capabilityChanges.length === 0) {
    return "";
  }

  const plural = capabilityChanges.length === 1 ? "change" : "changes";
  const lines: string[] = [
    "<details>",
    `<summary><strong>${capabilityName}</strong> (${capabilityChanges.length} ${plural})</summary>`,
    "",
  ];

  // Group by operation type
  const added = capabilityChanges.filter((c) => c.operation === "add");
  const modified = capabilityChanges.filter((c) => c.operation === "modify");
  const removed = capabilityChanges.filter((c) => c.operation === "remove");
  const renamed = capabilityChanges.filter((c) => c.operation === "rename");

  if (added.length > 0) {
    lines.push("#### Added");
    lines.push("");
    for (const change of added) {
      lines.push(`##### \`Requirement: ${change.requirementName}\``);
      if (change.content) {
        // Format content - skip the header line if it's included
        const content = change.content
          .split("\n")
          .filter((line) => !line.startsWith("### Requirement:"))
          .join("\n")
          .trim();
        if (content) {
          lines.push(content);
        }
      }
      lines.push("");
    }
  }

  if (modified.length > 0) {
    lines.push("#### Modified");
    lines.push("");
    for (const change of modified) {
      lines.push(`##### \`Requirement: ${change.requirementName}\``);
      if (change.content) {
        const content = change.content
          .split("\n")
          .filter((line) => !line.startsWith("### Requirement:"))
          .join("\n")
          .trim();
        if (content) {
          lines.push(content);
        }
      }
      lines.push("");
    }
  }

  if (renamed.length > 0) {
    lines.push("#### Renamed");
    lines.push("");
    for (const change of renamed) {
      lines.push(`- \`${change.oldName}\` → \`${change.requirementName}\``);
    }
    lines.push("");
  }

  if (removed.length > 0) {
    lines.push("#### Removed");
    lines.push("");
    for (const change of removed) {
      lines.push(`- \`Requirement: ${change.requirementName}\``);
    }
    lines.push("");
  }

  lines.push("</details>");

  return lines.join("\n");
}

/**
 * Format the full diff preview with all changes
 */
export function formatDiffPreview(changes: SpecChange[]): string {
  if (changes.length === 0) {
    return "_No spec changes detected_";
  }

  // Get unique capabilities
  const capabilities = [...new Set(changes.map((c) => c.capabilityName))];

  const sections: string[] = [];
  for (const capability of capabilities) {
    const section = formatCapabilityChanges(capability, changes);
    if (section) {
      sections.push(section);
    }
  }

  return sections.join("\n\n");
}

/**
 * Format the complete PR comment body
 */
export function formatPRComment(impact: SpecImpact): string {
  const marker = generatePRImpactMarker(impact.changeId);

  const sections: string[] = [
    marker,
    "",
    `## Spectr Impact: \`${impact.changeId}\``,
    "",
    formatStatusTable(impact),
    "",
    "### Summary",
    "",
    formatSummaryTable(impact.counts),
    "",
    "### Affected Capabilities",
    "",
    formatCapabilitiesList(impact),
    "",
    "### Changes",
    "",
    formatDiffPreview(impact.changes),
    "",
    "---",
    `*Generated by [spectr-action](https://github.com/connerohnesorge/spectr-action) | [View proposal](spectr/changes/${impact.changeId}/proposal.md)*`,
  ];

  let body = sections.join("\n");

  // Truncate if too long
  if (body.length > MAX_COMMENT_BODY_LENGTH) {
    const truncationNotice =
      "\n\n_... content truncated due to length ..._\n\n---\n*Generated by spectr-action*";
    const maxContentLength = MAX_COMMENT_BODY_LENGTH - truncationNotice.length;
    body = body.slice(0, maxContentLength) + truncationNotice;
  }

  return body;
}

/**
 * Check if two comment bodies are equivalent
 * Ignores whitespace differences
 */
export function commentsMatch(existing: string, updated: string): boolean {
  const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
  return normalize(existing) === normalize(updated);
}
