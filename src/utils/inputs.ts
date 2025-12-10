import * as core from "@actions/core";
import type { IssueSyncConfig } from "../issues/types";

export const version = core.getInput("version");
export const githubToken = core.getInput("github-token");
export const args = core.getInput("args");
export const src = core.getInput("src");
export const versionFile = core.getInput("version-file");

/**
 * Get issue sync configuration from action inputs
 */
export function getIssueSyncConfig(): IssueSyncConfig {
  const syncIssues = core.getInput("sync-issues");
  const issueLabels = core.getInput("issue-labels");
  const issueTitlePrefix = core.getInput("issue-title-prefix");
  const closeOnArchive = core.getInput("close-on-archive");
  const updateExisting = core.getInput("update-existing");
  const spectrLabel = core.getInput("spectr-label");
  const token = core.getInput("github-token");

  return {
    closeOnArchive: closeOnArchive.toLowerCase() !== "false",
    enabled: syncIssues.toLowerCase() === "true",
    githubToken: token,
    labels: parseLabels(issueLabels || "spectr,change-proposal"),
    spectrLabel: spectrLabel || "spectr-managed",
    titlePrefix: issueTitlePrefix || "[Spectr Change]",
    updateExisting: updateExisting.toLowerCase() !== "false",
  };
}

/**
 * Parse comma-separated labels into array
 */
function parseLabels(labelsInput: string): string[] {
  return labelsInput
    .split(",")
    .map((label) => label.trim())
    .filter((label) => label.length > 0);
}
