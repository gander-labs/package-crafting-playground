// SPDX-License-Identifier: AGPL-3.0-only
import { afterEach, expect, test } from "bun:test";
import { ghHeaders } from "./update.ts";

const saved = {
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GH_TOKEN: process.env.GH_TOKEN,
};

function clearTokens() {
  delete process.env.GITHUB_TOKEN;
  delete process.env.GH_TOKEN;
}

afterEach(() => {
  clearTokens();
  if (saved.GITHUB_TOKEN !== undefined)
    process.env.GITHUB_TOKEN = saved.GITHUB_TOKEN;
  if (saved.GH_TOKEN !== undefined) process.env.GH_TOKEN = saved.GH_TOKEN;
});

test("omits Authorization when no token is set", () => {
  clearTokens();
  expect(ghHeaders("application/json").Authorization).toBeUndefined();
});

test("sends a Bearer token from GITHUB_TOKEN", () => {
  clearTokens();
  process.env.GITHUB_TOKEN = "abc123";
  expect(ghHeaders("application/json").Authorization).toBe("Bearer abc123");
});

test("falls back to GH_TOKEN", () => {
  clearTokens();
  process.env.GH_TOKEN = "xyz789";
  expect(ghHeaders("application/json").Authorization).toBe("Bearer xyz789");
});
