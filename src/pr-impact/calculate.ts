/**
 * Spec impact calculation module
 *
 * Parses delta spec files and calculates the impact of changes
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { OperationCounts, PRMode, SpecChange, SpecImpact } from "./types";

/**
 * Delta type for categorizing spec changes
 */
type DeltaType = "ADDED" | "MODIFIED" | "REMOVED" | "RENAMED";

/**
 * Parsed delta plan from a spec file
 */
interface DeltaPlan {
  added: ParsedRequirement[];
  modified: ParsedRequirement[];
  removed: string[];
  renamed: RenameOp[];
}

/**
 * Parsed requirement from a delta spec
 */
interface ParsedRequirement {
  name: string;
  content: string;
}

/**
 * Rename operation
 */
interface RenameOp {
  from: string;
  to: string;
}

/**
 * Check if a change is archived
 * @param changeId - The change ID to check
 * @param workspacePath - Root workspace path
 * @returns true if archived
 */
export function checkArchiveStatus(
  changeId: string,
  workspacePath: string,
): boolean {
  const archivePath = path.join(workspacePath, "spectr", "changes", "archive");

  if (!fs.existsSync(archivePath)) {
    return false;
  }

  try {
    const entries = fs.readdirSync(archivePath);
    // Archive entries have format: YYYY-MM-DD-change-id
    for (const entry of entries) {
      if (entry.endsWith(`-${changeId}`) || entry === changeId) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Find all spec files under a change's specs directory
 * @param changeId - The change ID
 * @param workspacePath - Root workspace path
 * @returns Array of {capabilityName, filePath} objects
 */
function findDeltaSpecFiles(
  changeId: string,
  workspacePath: string,
): Array<{ capabilityName: string; filePath: string }> {
  const specsDir = path.join(
    workspacePath,
    "spectr",
    "changes",
    changeId,
    "specs",
  );

  if (!fs.existsSync(specsDir)) {
    return [];
  }

  const results: Array<{ capabilityName: string; filePath: string }> = [];

  try {
    const entries = fs.readdirSync(specsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const specFile = path.join(specsDir, entry.name, "spec.md");
        if (fs.existsSync(specFile)) {
          results.push({
            capabilityName: entry.name,
            filePath: specFile,
          });
        }
      }
    }
  } catch {
    return [];
  }

  return results;
}

/**
 * Match a requirement header and extract the name
 * Format: ### Requirement: Name
 */
function matchRequirementHeader(line: string): string | null {
  if (!line.startsWith("###")) {
    return null;
  }

  // Skip "###" and any whitespace
  let rest = line.slice(3).trimStart();

  // Must be followed by "Requirement:"
  if (!rest.startsWith("Requirement:")) {
    return null;
  }

  // Skip "Requirement:" and any whitespace
  rest = rest.slice(12).trimStart();

  return rest || null;
}

/**
 * Check if a line is an H3 header (starts with "### ")
 */
function isH3Header(line: string): boolean {
  return line.startsWith("### ");
}

/**
 * Check if a line is an H2 delta section header
 * Returns the delta type if matched, or null otherwise
 */
function matchH2DeltaSection(line: string): DeltaType | null {
  if (!line.startsWith("## ")) {
    return null;
  }

  const rest = line.slice(3).trim();

  const deltaTypes: DeltaType[] = ["ADDED", "MODIFIED", "REMOVED", "RENAMED"];
  for (const dt of deltaTypes) {
    if (rest === `${dt} Requirements`) {
      return dt;
    }
  }

  return null;
}

/**
 * Find the content of a delta section in the file
 * @param content - File content
 * @param deltaType - Type of delta section to find
 * @returns Section content (without header), or empty string if not found
 */
function findDeltaSectionContent(
  content: string,
  deltaType: DeltaType,
): string {
  const sectionHeader = `## ${deltaType} Requirements`;
  const headerStart = content.indexOf(sectionHeader);

  if (headerStart === -1) {
    return "";
  }

  // Find end of header line
  let headerEnd = headerStart + sectionHeader.length;
  while (headerEnd < content.length && content[headerEnd] !== "\n") {
    headerEnd++;
  }
  if (headerEnd < content.length) {
    headerEnd++; // Include the newline
  }

  // Find the next H2 header
  const rest = content.slice(headerEnd);
  const lines = rest.split("\n");
  let offset = 0;

  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("## ")) {
      return rest.slice(0, offset);
    }
    offset += line.length + 1; // +1 for newline
  }

  return rest;
}

/**
 * Parse requirements from a section content
 * @param sectionContent - Content of a delta section (ADDED or MODIFIED)
 * @returns Array of parsed requirements
 */
function parseRequirementsFromSection(
  sectionContent: string,
): ParsedRequirement[] {
  const requirements: ParsedRequirement[] = [];
  let currentReq: ParsedRequirement | null = null;

  const lines = sectionContent.split("\n");

  for (const line of lines) {
    const name = matchRequirementHeader(line);
    if (name) {
      // Save previous requirement
      if (currentReq) {
        requirements.push(currentReq);
      }
      // Start new requirement
      currentReq = {
        content: `${line}\n`,
        name,
      };
      continue;
    }

    // Check for non-requirement H3 header (ends current requirement)
    if (isH3Header(line) && !matchRequirementHeader(line)) {
      if (currentReq) {
        requirements.push(currentReq);
        currentReq = null;
      }
      continue;
    }

    // Check for H2 header (ends current section)
    if (line.startsWith("## ")) {
      break;
    }

    // Append line to current requirement
    if (currentReq) {
      currentReq.content += `${line}\n`;
    }
  }

  // Save the last requirement
  if (currentReq) {
    requirements.push(currentReq);
  }

  return requirements;
}

/**
 * Parse removed requirements from section content
 * Removed requirements are just names (from headers or list items)
 */
function parseRemovedSection(sectionContent: string): string[] {
  const removed: string[] = [];
  const lines = sectionContent.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for requirement header
    const name = matchRequirementHeader(trimmed);
    if (name) {
      removed.push(name);
      continue;
    }

    // Check for list item (- Name or * Name)
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const itemText = trimmed.slice(2).trim();
      if (itemText) {
        removed.push(itemText);
      }
    }
  }

  return removed;
}

/**
 * Match FROM line in RENAMED section
 * Format: - FROM: `### Requirement: Old Name`
 */
function matchRenamedFrom(line: string): string | null {
  const trimmed = line.trim();

  if (!trimmed.startsWith("-")) {
    return null;
  }

  let rest = trimmed.slice(1).trim();
  const upper = rest.toUpperCase();

  if (!upper.startsWith("FROM:")) {
    return null;
  }

  rest = rest.slice(5).trim();

  // Check for backtick-wrapped content
  if (rest.startsWith("`") && rest.endsWith("`")) {
    const content = rest.slice(1, -1);
    const upperContent = content.toUpperCase();

    if (!upperContent.startsWith("### REQUIREMENT:")) {
      return null;
    }

    const name = content.slice(16).trim(); // len("### Requirement:") = 16
    return name || null;
  }

  // Try without backticks: - FROM: ### Requirement: Name
  if (!rest.startsWith("###")) {
    return null;
  }

  rest = rest.slice(3).trimStart();
  const restUpper = rest.toUpperCase();

  if (!restUpper.startsWith("REQUIREMENT:")) {
    return null;
  }

  const name = rest.slice(12).trim();
  return name || null;
}

/**
 * Match TO line in RENAMED section
 * Format: - TO: `### Requirement: New Name`
 */
function matchRenamedTo(line: string): string | null {
  const trimmed = line.trim();

  if (!trimmed.startsWith("-")) {
    return null;
  }

  let rest = trimmed.slice(1).trim();
  const upper = rest.toUpperCase();

  if (!upper.startsWith("TO:")) {
    return null;
  }

  rest = rest.slice(3).trim();

  // Check for backtick-wrapped content
  if (rest.startsWith("`") && rest.endsWith("`")) {
    const content = rest.slice(1, -1);
    const upperContent = content.toUpperCase();

    if (!upperContent.startsWith("### REQUIREMENT:")) {
      return null;
    }

    const name = content.slice(16).trim();
    return name || null;
  }

  // Try without backticks
  if (!rest.startsWith("###")) {
    return null;
  }

  rest = rest.slice(3).trimStart();
  const restUpper = rest.toUpperCase();

  if (!restUpper.startsWith("REQUIREMENT:")) {
    return null;
  }

  const name = rest.slice(12).trim();
  return name || null;
}

/**
 * Parse renamed requirements from section content
 * Format: FROM/TO pairs on separate lines
 */
function parseRenamedSection(sectionContent: string): RenameOp[] {
  const renamed: RenameOp[] = [];
  let currentFrom: string | null = null;

  const lines = sectionContent.split("\n");

  for (const line of lines) {
    // Check for FROM line
    const fromName = matchRenamedFrom(line);
    if (fromName) {
      currentFrom = fromName;
      continue;
    }

    // Check for TO line
    const toName = matchRenamedTo(line);
    if (toName && currentFrom) {
      renamed.push({
        from: currentFrom,
        to: toName,
      });
      currentFrom = null;
    }
  }

  return renamed;
}

/**
 * Parse a delta spec file and extract all operations
 * @param filePath - Path to the spec.md file
 * @returns Parsed delta plan
 */
export function parseDeltaSpec(filePath: string): DeltaPlan {
  const plan: DeltaPlan = {
    added: [],
    modified: [],
    removed: [],
    renamed: [],
  };

  try {
    const content = fs.readFileSync(filePath, "utf-8");

    // Parse each section
    const addedContent = findDeltaSectionContent(content, "ADDED");
    if (addedContent) {
      plan.added = parseRequirementsFromSection(addedContent);
    }

    const modifiedContent = findDeltaSectionContent(content, "MODIFIED");
    if (modifiedContent) {
      plan.modified = parseRequirementsFromSection(modifiedContent);
    }

    const removedContent = findDeltaSectionContent(content, "REMOVED");
    if (removedContent) {
      plan.removed = parseRemovedSection(removedContent);
    }

    const renamedContent = findDeltaSectionContent(content, "RENAMED");
    if (renamedContent) {
      plan.renamed = parseRenamedSection(renamedContent);
    }
  } catch {
    // Return empty plan on error
  }

  return plan;
}

/**
 * Calculate spec impact for a change proposal
 * @param changeId - The change ID
 * @param workspacePath - Root workspace path
 * @param mode - PR mode (proposal, archive, remove)
 * @returns Full spec impact
 */
export async function calculateSpecImpact(
  changeId: string,
  workspacePath: string,
  mode: PRMode,
): Promise<SpecImpact> {
  const isArchived = checkArchiveStatus(changeId, workspacePath);
  const specFiles = findDeltaSpecFiles(changeId, workspacePath);

  const changes: SpecChange[] = [];
  const capabilities: string[] = [];
  const counts: OperationCounts = {
    added: 0,
    modified: 0,
    removed: 0,
    renamed: 0,
    total: 0,
  };

  for (const { capabilityName, filePath } of specFiles) {
    capabilities.push(capabilityName);
    const plan = parseDeltaSpec(filePath);

    // Process added requirements
    for (const req of plan.added) {
      changes.push({
        capabilityName,
        content: req.content.trim(),
        operation: "add",
        requirementName: req.name,
      });
      counts.added++;
    }

    // Process modified requirements
    for (const req of plan.modified) {
      changes.push({
        capabilityName,
        content: req.content.trim(),
        operation: "modify",
        requirementName: req.name,
      });
      counts.modified++;
    }

    // Process removed requirements
    for (const name of plan.removed) {
      changes.push({
        capabilityName,
        operation: "remove",
        requirementName: name,
      });
      counts.removed++;
    }

    // Process renamed requirements
    for (const rename of plan.renamed) {
      changes.push({
        capabilityName,
        oldName: rename.from,
        operation: "rename",
        requirementName: rename.to,
      });
      counts.renamed++;
    }
  }

  counts.total =
    counts.added + counts.modified + counts.removed + counts.renamed;

  return {
    capabilities,
    changeId,
    changes,
    counts,
    isArchived,
    mode,
  };
}
