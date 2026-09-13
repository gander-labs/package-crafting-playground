// SPDX-License-Identifier: AGPL-3.0-only
import { expect, test } from "bun:test";
import { parseSync } from "@optique/core/parser";
import { parser } from "./cli.ts";

test("parses with no arguments", () => {
  const result = parseSync(parser, []);
  expect(result.success).toBe(true);
  if (result.success) expect(result.value).toBeUndefined();
});

test("parses the update command without a version", () => {
  const result = parseSync(parser, ["update"]);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.value?.command).toBe("update");
    expect(result.value?.version).toBeUndefined();
  }
});

test("parses the update command with a version", () => {
  const result = parseSync(parser, ["update", "1.2.3"]);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.value?.command).toBe("update");
    expect(result.value?.version).toBe("1.2.3");
  }
});

test("fails on an unexpected argument", () => {
  const result = parseSync(parser, ["--bogus"]);
  expect(result.success).toBe(false);
});
