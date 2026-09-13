// SPDX-License-Identifier: AGPL-3.0-only
// TODO: swap the subprocess for @optique/testing (captureRun / createCliRunner)
// once it ships a stable release — currently only published as 1.3.0-dev.

import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import pkg from "./package.json" with { type: "json" };

const { version } = pkg;

const entry = new URL("./index.ts", import.meta.url).pathname;

function runCli(...args: string[]) {
  // Always spawn via `node`, regardless of which runtime runs this test
  // suite — this is the smoke test that the published npx entry actually
  // works under Node, not just under Bun's own execPath.
  const { stdout, stderr, status } = spawnSync("node", [entry, ...args], {
    encoding: "utf8",
  });
  return { stdout, stderr, exitCode: status };
}

test("writes a non-empty response when run with no arguments", () => {
  const { stdout, exitCode } = runCli();
  expect(exitCode).toBe(0);
  expect(stdout.trim().length).toBeGreaterThan(0);
});

test("shows help output when run with no arguments", () => {
  const { stdout } = runCli();
  expect(stdout).toContain("Usage:");
  expect(stdout).toContain("update");
});

test("shows the package version with --version", () => {
  const { stdout, exitCode } = runCli("--version");
  expect(exitCode).toBe(0);
  expect(stdout.trim()).toBe(version);
});
