// SPDX-License-Identifier: AGPL-3.0-only
import { message } from "@optique/core/message";
import { run } from "@optique/run";
import { parser } from "./cli.ts";
import pkg from "./package.json" with { type: "json" };
import { selfUpdate } from "./update.ts";

const { version } = pkg;

const runOptions = {
  brief: message`New Bun App CLI.`,
  version,
  help: "option" as const,
};

// `run()` reads argv itself; no Optique "help on empty" toggle, so lean on the
// contract that an optional() parser yields undefined on no args, then re-run
// with --help so a bare call prints usage instead of doing nothing.
// Wrapped in an IIFE (no top-level await) so this bundles to CJS for the
// Node SEA build in scripts/build-exe-node.mjs.
(async () => {
  const config = run(parser, runOptions);

  if (config === undefined) {
    run(parser, { ...runOptions, args: ["--help"] });
  }

  if (config?.command === "update") {
    await selfUpdate(config.version);
  }
})();
