/**
 * Change discovery module
 *
 * Scans spectr/changes/ directory to find active and archived change proposals
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ChangeProposal } from "./types";

const CHANGES_DIR = "spectr/changes";
const ARCHIVE_DIR = "spectr/changes/archive";
const PROPOSAL_FILE = "proposal.md";
const TASKS_FILE = "tasks.md";
const TASKS_JSON_FILE = "tasks.json";
const SPECS_DIR = "specs";

/**
 * Discover all active (non-archived) change proposals
 * @param workspacePath - Root path of the repository
 * @returns Array of active change proposals
 */
export async function discoverActiveChanges(
  workspacePath: string,
): Promise<ChangeProposal[]> {
  const changesPath = path.join(workspacePath, CHANGES_DIR);

  if (!fs.existsSync(changesPath)) {
    return [];
  }

  const entries = fs.readdirSync(changesPath, { withFileTypes: true });
  const proposals: ChangeProposal[] = [];

  for (const entry of entries) {
    // Skip non-directories and the archive directory
    if (!entry.isDirectory() || entry.name === "archive") {
      continue;
    }

    const changePath = path.join(changesPath, entry.name);
    const proposalPath = path.join(changePath, PROPOSAL_FILE);

    // Only process directories with a proposal.md file
    if (!fs.existsSync(proposalPath)) {
      continue;
    }

    const proposal = await readChangeProposal(entry.name, changePath, false);
    if (proposal) {
      proposals.push(proposal);
    }
  }

  return proposals;
}

/**
 * Discover all archived change proposals
 * @param workspacePath - Root path of the repository
 * @returns Array of archived change proposals
 */
export async function discoverArchivedChanges(
  workspacePath: string,
): Promise<ChangeProposal[]> {
  const archivePath = path.join(workspacePath, ARCHIVE_DIR);

  if (!fs.existsSync(archivePath)) {
    return [];
  }

  const entries = fs.readdirSync(archivePath, { withFileTypes: true });
  const proposals: ChangeProposal[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const changePath = path.join(archivePath, entry.name);
    const proposalPath = path.join(changePath, PROPOSAL_FILE);

    // Only process directories with a proposal.md file
    if (!fs.existsSync(proposalPath)) {
      continue;
    }

    const proposal = await readChangeProposal(entry.name, changePath, true);
    if (proposal) {
      proposals.push(proposal);
    }
  }

  return proposals;
}

/**
 * Read a change proposal from a directory
 * @param id - Change ID (directory name)
 * @param changePath - Full path to the change directory
 * @param isArchived - Whether the change is in the archive
 * @returns Change proposal or null if invalid
 */
async function readChangeProposal(
  id: string,
  changePath: string,
  isArchived: boolean,
): Promise<ChangeProposal | null> {
  const proposalContent = readProposalContent(changePath);
  if (!proposalContent) {
    return null;
  }

  const tasksContent = readTasksContent(changePath);
  const affectedSpecs = findAffectedSpecs(changePath);

  return {
    affectedSpecs,
    id,
    isArchived,
    path: changePath,
    proposalContent,
    tasksContent,
  };
}

/**
 * Read proposal.md content from a change directory
 * @param changePath - Path to the change directory
 * @returns Content of proposal.md or null if not found
 */
export function readProposalContent(changePath: string): string | null {
  const proposalPath = path.join(changePath, PROPOSAL_FILE);

  try {
    return fs.readFileSync(proposalPath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Read tasks content from a change directory
 * Supports both tasks.md and tasks.json formats
 * @param changePath - Path to the change directory
 * @returns Content of tasks file or undefined if not found
 */
export function readTasksContent(changePath: string): string | undefined {
  // Try tasks.md first
  const tasksMarkdownPath = path.join(changePath, TASKS_FILE);
  try {
    return fs.readFileSync(tasksMarkdownPath, "utf-8");
  } catch {
    // Fall through to try JSON
  }

  // Try tasks.json
  const tasksJsonPath = path.join(changePath, TASKS_JSON_FILE);
  try {
    const jsonContent = fs.readFileSync(tasksJsonPath, "utf-8");
    return formatTasksJsonAsMarkdown(jsonContent);
  } catch {
    return undefined;
  }
}

/**
 * Format tasks.json content as Markdown for display in issues
 */
function formatTasksJsonAsMarkdown(jsonContent: string): string {
  try {
    const data = JSON.parse(jsonContent) as {
      tasks: Array<{
        id: string;
        section: string;
        description: string;
        status: string;
      }>;
    };
    if (!data.tasks || !Array.isArray(data.tasks)) {
      return jsonContent;
    }

    const sections = new Map<
      string,
      Array<{ id: string; description: string; status: string }>
    >();

    for (const task of data.tasks) {
      const section = task.section || "Tasks";
      if (!sections.has(section)) {
        sections.set(section, []);
      }
      sections.get(section)?.push({
        description: task.description,
        id: task.id,
        status: task.status,
      });
    }

    const lines: string[] = ["# Tasks", ""];

    for (const [section, tasks] of sections) {
      lines.push(`## ${section}`, "");
      for (const task of tasks) {
        const checkbox = task.status === "completed" ? "[x]" : "[ ]";
        const statusBadge =
          task.status === "in_progress" ? " *(in progress)*" : "";
        lines.push(
          `- ${checkbox} ${task.id}: ${task.description}${statusBadge}`,
        );
      }
      lines.push("");
    }

    return lines.join("\n");
  } catch {
    return jsonContent;
  }
}

/**
 * Find affected specs by listing directories in specs/ subdirectory
 * @param changePath - Path to the change directory
 * @returns Array of spec names (directory names)
 */
export function findAffectedSpecs(changePath: string): string[] {
  const specsPath = path.join(changePath, SPECS_DIR);

  if (!fs.existsSync(specsPath)) {
    return [];
  }

  try {
    const entries = fs.readdirSync(specsPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}
