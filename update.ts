// SPDX-License-Identifier: AGPL-3.0-only
import { chmod, rename, writeFile } from "node:fs/promises";
import pkg from "./package.json" with { type: "json" };

const CURRENT_VERSION = pkg.version;
const REPO = "gander-labs/new-bun-app";
// Three compiled executables ship per release (dist/new-app-bun,
// dist/new-app-node, dist/new-app-deno); update in place to the same
// runtime flavor that's currently running.
const ASSET_NAME = process.versions.bun
  ? "new-app-bun"
  : process.versions.deno
    ? "new-app-deno"
    : "new-app-node";

interface Release {
  tag_name: string;
  assets: { name: string; url: string }[];
}

function githubToken(): string | undefined {
  return process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? undefined;
}

/** GitHub returns 404 (not 403) for unauthenticated requests to private repos. */
export function ghHeaders(accept: string): Record<string, string> {
  const token = githubToken();
  return {
    Accept: accept,
    "User-Agent": ASSET_NAME,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function parseVersionTag(tag: string): string | null {
  const match = /^v?(\d+\.\d+\.\d+)$/.exec(tag.trim());
  return match?.[1] ?? null;
}

async function fetchRelease(url: string): Promise<Release> {
  const res = await fetch(url, {
    headers: ghHeaders("application/vnd.github+json"),
  });
  if (!res.ok) {
    const hint =
      res.status === 404
        ? " — no published release yet, or set GITHUB_TOKEN/GH_TOKEN for a private repo"
        : "";
    throw new Error(
      `Failed to fetch release: ${res.status} ${res.statusText}${hint}`,
    );
  }
  return (await res.json()) as Release;
}

export async function selfUpdate(version?: string): Promise<void> {
  if (version !== undefined && !parseVersionTag(version)) {
    throw new Error(`Invalid version "${version}", expected X.Y.Z`);
  }

  const url =
    version === undefined
      ? `https://api.github.com/repos/${REPO}/releases/latest`
      : `https://api.github.com/repos/${REPO}/releases/tags/${version.replace(/^v?/, "v")}`;

  const release = await fetchRelease(url);
  const latestVersion = parseVersionTag(release.tag_name);
  if (!latestVersion)
    throw new Error(`Release tag "${release.tag_name}" is not a valid version`);

  // Both are regex-validated X.Y.Z, so numeric collation orders them exactly.
  // An explicit version bypasses the check (allows re-install / downgrade).
  if (
    version === undefined &&
    latestVersion.localeCompare(CURRENT_VERSION, undefined, {
      numeric: true,
    }) <= 0
  ) {
    console.log(`Already up to date (${CURRENT_VERSION}).`);
    return;
  }

  const asset = release.assets.find((a) => a.name === ASSET_NAME);
  if (!asset)
    throw new Error(
      `No "${ASSET_NAME}" asset found in release ${release.tag_name}`,
    );

  const binaryRes = await fetch(asset.url, {
    headers: ghHeaders("application/octet-stream"),
  });
  if (!binaryRes.ok) {
    throw new Error(
      `Failed to download update: ${binaryRes.status} ${binaryRes.statusText}`,
    );
  }

  const target = process.execPath;
  const tmp = `${target}.update`;
  // ponytail: buffers the whole asset in memory; stream to disk if it grows large
  await writeFile(tmp, Buffer.from(await binaryRes.arrayBuffer()));
  await chmod(tmp, 0o755);
  await rename(tmp, target);
  console.log(`Updated to ${release.tag_name}.`);
}
