// SPDX-License-Identifier: AGPL-3.0-only
// Builds dist/new-app-node: a Node.js Single Executable Application (SEA).
// Bun is used only as a bundler here (--target node --format cjs), so its
// output has no Bun runtime in it — the final binary is a copy of the local
// `node` executable with the bundled app injected via postject.
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { inject } from "postject";

const DIST = "dist";
const BUNDLE = `${DIST}/new-app-node.cjs`;
const BLOB = `${DIST}/new-app-node.blob`;
const CONFIG = `${DIST}/new-app-node.sea-config.json`;
const OUTPUT = `${DIST}/new-app-node`;
const SENTINEL_FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";

execFileSync(
  "bun",
  [
    "build",
    "./index.ts",
    "--target",
    "node",
    "--format",
    "cjs",
    "--outfile",
    BUNDLE,
  ],
  { stdio: "inherit" },
);

writeFileSync(
  CONFIG,
  JSON.stringify({
    main: BUNDLE,
    output: BLOB,
    disableExperimentalSEAWarning: true,
  }),
);
execFileSync(process.execPath, ["--experimental-sea-config", CONFIG], {
  stdio: "inherit",
});

copyFileSync(process.execPath, OUTPUT);
await inject(OUTPUT, "NODE_SEA_BLOB", readFileSync(BLOB), {
  sentinelFuse: SENTINEL_FUSE,
});
chmodSync(OUTPUT, 0o755);

for (const f of [BUNDLE, BLOB, CONFIG]) rmSync(f, { force: true });

console.log(`Built ${OUTPUT}`);
