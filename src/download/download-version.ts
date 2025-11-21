import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import { Octokit } from "@octokit/core";
import { paginateRest } from "@octokit/plugin-paginate-rest";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { OWNER, REPO, TOOL_CACHE_NAME } from "../utils/constants";
import type { Architecture, Platform } from "../utils/platforms";

const PaginatingOctokit = Octokit.plugin(paginateRest, restEndpointMethods);

export function tryGetFromToolCache(
  arch: Architecture,
  version: string,
): { version: string; installedPath: string | undefined } {
  core.debug(`Trying to get spectr from tool cache for ${version}...`);
  const cachedVersions = tc.findAllVersions(TOOL_CACHE_NAME, arch);
  core.debug(`Cached versions: ${cachedVersions}`);
  let resolvedVersion = tc.evaluateVersions(cachedVersions, version);
  if (resolvedVersion === "") {
    resolvedVersion = version;
  }
  const installedPath = tc.find(TOOL_CACHE_NAME, resolvedVersion, arch);
  return { installedPath, version: resolvedVersion };
}

export async function downloadVersion(
  platform: Platform,
  arch: Architecture,
  version: string,
  githubToken: string,
): Promise<{ version: string; cachedToolDir: string }> {
  const artifact = `spectr_${platform}_${arch}`;
  let extension = ".tar.gz";
  if (platform === "Windows") {
    extension = ".zip";
  }
  const downloadUrl = constructDownloadUrl(version, platform, arch);
  core.debug(`Downloading spectr from "${downloadUrl}" ...`);

  const downloadPath = await tc.downloadTool(
    downloadUrl,
    undefined,
    githubToken,
  );
  core.debug(`Downloaded spectr to "${downloadPath}"`);

  const extractedDir = await extractDownloadedArtifact(
    version,
    downloadPath,
    extension,
    platform,
    artifact,
  );

  const cachedToolDir = await tc.cacheDir(
    extractedDir,
    TOOL_CACHE_NAME,
    version,
    arch,
  );
  return { cachedToolDir, version: version };
}

function constructDownloadUrl(
  version: string,
  platform: Platform,
  arch: Architecture,
): string {
  // GoReleaser artifact naming: spectr_{Platform}_{arch}.{ext}
  const artifact = `spectr_${platform}_${arch}`;
  let extension = ".tar.gz";
  if (platform === "Windows") {
    extension = ".zip";
  }
  // Spectr releases use the version tag directly
  return `https://github.com/${OWNER}/${REPO}/releases/download/${version}/${artifact}${extension}`;
}

async function extractDownloadedArtifact(
  _version: string,
  downloadPath: string,
  extension: string,
  platform: Platform,
  _artifact: string,
): Promise<string> {
  let spectrDir: string;
  if (platform === "Windows") {
    const fullPathWithExtension = `${downloadPath}${extension}`;
    await fs.copyFile(downloadPath, fullPathWithExtension);
    spectrDir = await tc.extractZip(fullPathWithExtension);
    // On windows extracting the zip does not create an intermediate directory
  } else {
    spectrDir = await tc.extractTar(downloadPath);
    // Check if an intermediate directory was created
    const files = await fs.readdir(spectrDir);
    if (files.length === 1) {
      const potentialDir = path.join(spectrDir, files[0]);
      const stat = await fs.stat(potentialDir);
      if (stat.isDirectory()) {
        spectrDir = potentialDir;
      }
    }
  }
  const files = await fs.readdir(spectrDir);
  core.debug(`Contents of ${spectrDir}: ${files.join(", ")}`);
  return spectrDir;
}

export async function resolveVersion(
  versionInput: string,
  githubToken: string,
): Promise<string> {
  core.debug(`Resolving ${versionInput}...`);
  const version =
    versionInput === "latest"
      ? await getLatestVersion(githubToken)
      : versionInput;
  if (tc.isExplicitVersion(version)) {
    core.debug(`Version ${version} is an explicit version.`);
    const normalizedVersion = version.startsWith("v") ? version : `v${version}`;
    if (normalizedVersion !== version) {
      core.debug(`Normalized explicit version to ${normalizedVersion}`);
    }
    return normalizedVersion;
  }
  const availableVersions = await getAvailableVersions(githubToken);
  const resolvedVersion = maxSatisfying(availableVersions, version);
  if (resolvedVersion === undefined) {
    throw new Error(`No version found for ${version}`);
  }
  core.debug(`Resolved version: ${resolvedVersion}`);
  return resolvedVersion;
}

async function getAvailableVersions(githubToken: string): Promise<string[]> {
  try {
    const octokit = new PaginatingOctokit({
      auth: githubToken,
    });
    return await getReleaseTagNames(octokit);
  } catch (err) {
    if ((err as Error).message.includes("Bad credentials")) {
      core.info(
        "No (valid) GitHub token provided. Falling back to anonymous. Requests might be rate limited.",
      );
      const octokit = new PaginatingOctokit();
      return await getReleaseTagNames(octokit);
    }
    throw err;
  }
}

async function getReleaseTagNames(
  octokit: InstanceType<typeof PaginatingOctokit>,
): Promise<string[]> {
  const response = await octokit.paginate(octokit.rest.repos.listReleases, {
    owner: OWNER,
    repo: REPO,
  });
  return response.map((release) => release.tag_name);
}

async function getLatestVersion(githubToken: string) {
  const octokit = new PaginatingOctokit({
    auth: githubToken,
  });

  let latestRelease: { tag_name: string } | undefined;
  try {
    latestRelease = await getLatestRelease(octokit);
  } catch (err) {
    if ((err as Error).message.includes("Bad credentials")) {
      core.info(
        "No (valid) GitHub token provided. Falling back to anonymous. Requests might be rate limited.",
      );
      const octokit = new PaginatingOctokit();
      try {
        latestRelease = await getLatestRelease(octokit);
      } catch (anonErr) {
        // If latest release fails anonymously, try to get all releases
        core.debug("Failed to get latest release, trying all releases...");
        return await getLatestVersionFromAllReleases(octokit);
      }
    } else if ((err as Error).message.includes("Not Found")) {
      // No "latest" release found, try to get all releases and use the most recent
      core.debug("No latest release found, checking all releases...");
      return await getLatestVersionFromAllReleases(octokit);
    } else {
      core.error(
        "Github API request failed while getting latest release. Check the GitHub status page for outages. Try again later.",
      );
      throw err;
    }
  }

  if (!latestRelease) {
    throw new Error("Could not determine latest release.");
  }
  return latestRelease.tag_name;
}

async function getLatestVersionFromAllReleases(
  octokit: InstanceType<typeof PaginatingOctokit>,
): Promise<string> {
  try {
    const releases = await getReleaseTagNames(octokit);
    if (releases.length === 0) {
      throw new Error(
        `No releases found in ${OWNER}/${REPO}. Please create a release before using 'latest' version. Visit: https://github.com/${OWNER}/${REPO}/releases/new`,
      );
    }
    // Return the first release (most recent)
    core.info(`Using most recent release: ${releases[0]}`);
    return releases[0];
  } catch (err) {
    if ((err as Error).message.includes("No releases found")) {
      throw err;
    }
    throw new Error(
      `Failed to fetch releases from ${OWNER}/${REPO}: ${(err as Error).message}`,
    );
  }
}

async function getLatestRelease(
  octokit: InstanceType<typeof PaginatingOctokit>,
) {
  const { data: latestRelease } = await octokit.rest.repos.getLatestRelease({
    owner: OWNER,
    repo: REPO,
  });
  return latestRelease;
}

function maxSatisfying(
  versions: string[],
  version: string,
): string | undefined {
  const maxSemver = tc.evaluateVersions(versions, version);
  if (maxSemver !== "") {
    core.debug(`Found a version that satisfies the semver range: ${maxSemver}`);
    return maxSemver;
  }
  return undefined;
}
