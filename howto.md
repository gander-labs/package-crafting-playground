# How to publish `@gander-labs/package-crafting-playground` to npm

Publishing to <https://registry.npmjs.org/> uses npm's
[Trusted Publishing][1]: the release workflow exchanges its GitHub Actions
OIDC identity for a short-lived npm credential, no stored token required.

- **Registry:** `https://registry.npmjs.org/`
- **Package:** `@gander-labs/package-crafting-playground`
- **Workflow:** `.github/workflows/release.yml` (manual, `workflow_dispatch`)

---

## 1. Prerequisites

- An npmjs.com account with publish access to the `@gander-labs` scope.
- Push access to `gander-labs/package-crafting-playground` and permission to
  manage its Actions secrets/variables, if you ever need to fall back to a
  token (see below).

---

## 2. One-time setup: link the Trusted Publisher

On <https://www.npmjs.com/>, open the package settings (or, for a first
publish, set this up right after the first manual `npm publish`):

1. Package → **Settings** → **Trusted Publisher**.
2. Provider: **GitHub Actions**.
3. Repository: `gander-labs/package-crafting-playground`.
4. Workflow filename: `release.yml`.
5. Environment: leave blank (the job doesn't use a GitHub Environment).

No secret is created or stored anywhere. This link is what lets
`registry.npmjs.org` trust the OIDC token GitHub Actions presents at publish
time.

---

## 3. How the workflow is wired (already committed)

**`package.json`**

```json
"bin":   { "package-crafting-playground": "dist/package-crafting-playground.js" },
"files": ["dist/package-crafting-playground.js"],
"publishConfig": {
  "access": "public"
}
```

`bin` makes the package runnable via `npx`; `files` is what pulls the
(git-ignored) `dist/package-crafting-playground.js` into the tarball. No
`registry` is set in `publishConfig`, so `npm publish` targets npm's default
registry, `https://registry.npmjs.org/`. `access: "public"` is required
because the package is scoped (`@gander-labs/...`) — scoped packages default
to private otherwise.

**`.github/workflows/release.yml`**

```yaml
permissions:
  contents: write
  id-token: write   # lets npm (and JSR) exchange this for a short-lived credential

steps:
  - name: Setup Node
    uses: actions/setup-node@…
    with:
      node-version: 26
      registry-url: https://registry.npmjs.org

  - name: release-it
    run: bunx release-it ${{ inputs.bump }} --ci
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`registry-url` is required for npm's OIDC exchange to trigger, even though no
token ends up in `.npmrc`. npm CLI ≥ 11.5.1 is required (Node 26 ships a
recent-enough npm). No `NODE_AUTH_TOKEN` secret exists or is needed.

Trusted publishing also attaches a
[provenance attestation](https://docs.npmjs.com/generating-provenance-statements)
automatically — a signed statement (via Sigstore, using the same OIDC token)
proving the package was built from this exact repo/workflow/commit. No flag
or repo variable turns this on; npm does it on every OIDC-authenticated
publish. `package.json`'s `repository.url` must match the repo the workflow
runs in, or npm rejects the publish with a provenance validation error.

---

## 4. Run a release

1. GitHub → **Actions** → **Release** → **Run workflow**.
2. Choose the version bump: `patch`, `minor`, or `major`.
3. **Run workflow**.

The job then:

1. runs the `Code` workflow (lint / typecheck / tests),
2. `Build and verify artifacts` — `bun run build` and smoke-test all three
   outputs by actually running `--version` (sanity check before any version
   bump),
3. `npm version` bumps `package.json`, then release-it commits it as
   `chore: release vX.Y.Z` and tags `vX.Y.Z`,
4. `after:bump` hook syncs `jsr.json`'s version to match and re-runs
   `bun run build`,
5. `npm publish` (OIDC trusted publishing) → `@gander-labs/package-crafting-playground@X.Y.Z` to npm,
6. `git push` of the commit + tag,
7. `deno publish` → `@gander-labs/package-crafting-playground@X.Y.Z` to JSR (OIDC, no
   token — see [Publishing to JSR](#publishing-to-jsr) below),
8. creates a GitHub Release with the three compiled binaries attached.

If step 5 fails, release-it rolls back steps 3–4 (no tag, no commit pushed).

---

## 5. Verify

```bash
npm view @gander-labs/package-crafting-playground version
npm view @gander-labs/package-crafting-playground
```

Also check the run's **Summary** panel for the Release URL and binary link,
and the repo's **Releases** page for the `vX.Y.Z` tag.

---

## Four artifacts, two channels

`bun run build` produces **all four** outputs:

| Script | Output | Goes to | Consumed as |
|---|---|---|---|
| `build:js` | `dist/package-crafting-playground.js` (Node bundle, `#!/usr/bin/env node` banner) | **npm tarball** (`files: ["dist/package-crafting-playground.js"]`, `bin.package-crafting-playground`) | `npx @gander-labs/package-crafting-playground`, `npm i -g` — no Bun needed at runtime |
| `build:bin:bun` | `dist/package-crafting-playground-bun` (`bun build --compile`, single-platform ELF, ~80 MB, embeds the Bun runtime) | **GitHub Release asset** (`.release-it.json` → `github.assets`) | `update.ts` self-update downloads it when running under Bun |
| `build:bin:node` | `dist/package-crafting-playground-node` (`scripts/build-exe-node.mjs`, Node's Single Executable Application feature — Bun is only used as the bundling step, its output embeds the Node runtime, not Bun's) | **GitHub Release asset** (`.release-it.json` → `github.assets`) | `update.ts` self-update downloads it when running under Node |
| `build:bin:deno` | `dist/package-crafting-playground-deno` (`deno compile`, ~100 MB, embeds the Deno runtime) | **GitHub Release asset** (`.release-it.json` → `github.assets`) | `update.ts` self-update downloads it when running under Deno |

All three compiled executables are built and shipped side by side so the
approaches can be compared; `update.ts` picks the matching asset via
`process.versions.bun` / `process.versions.deno`.

The npm package deliberately ships **only** the `.js` bundle + `README` +
`package.json` (~80 kB) — the compiled binary is not in it. `dist/` is
git-ignored; the `files` allowlist is what puts the bundle in the tarball.

## Publishing to JSR

A second, independent publish target: [JSR](https://jsr.io) hosts the raw
TypeScript source (`index.ts`, `cli.ts`, `update.ts`) directly, no build step
involved — `jsr.json`'s `publish.include` scopes the published files the same
way `package.json`'s `files` does for npm.

**One-time setup (manual, not something this repo's config can do):**

1. Create the `@gander-labs` scope on <https://jsr.io> if it doesn't exist yet.
2. Create the `package-crafting-playground` package under that scope.
3. In the package's **Settings → Publishing**, link it to this GitHub repo and
   the `.github/workflows/release.yml` workflow. This is what lets `deno
   publish` authenticate via GitHub Actions OIDC (`id-token: write`) with no
   token secret to manage.

Until that link exists, the `Publish to JSR` step in the Release workflow
fails on its first run — link the package before running a release, or
expect (and re-run after linking) that one failure.

Verify a published version actually runs:

```bash
npx --yes @gander-labs/package-crafting-playground@latest --version
```

---

## 6. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `npm error the given OIDC or trusted publisher config could not be validated` | Trusted Publisher on npmjs.com doesn't match this repo/workflow filename exactly, or hasn't been linked yet (step 2). |
| `npm ERR! 403 … not allowed to publish` | The `@gander-labs` scope/package is owned by a different npm account, or the Trusted Publisher link is missing/wrong. Confirm the name is `@gander-labs/package-crafting-playground`. |
| `EPUBLISHCONFLICT` / `cannot publish over previously published version` | That version already exists. Bump again (run the workflow with `patch`). |
| `npm error code ENEEDAUTH` in CI | OIDC exchange didn't trigger — check the job has `permissions: id-token: write` and `registry-url` is set on `setup-node`. |
| `npm error 422 … Error verifying sigstore provenance bundle: … package.json: "repository.url" is "…", expected to match "https://github.com/…"` | `package.json`'s `repository.url` is missing or doesn't match this repo. Trusted publishing always attaches provenance, and npm validates it against `repository`. |
| `npm error "provenance" is only supported when publishing packages with public access` | Shouldn't happen — `publishConfig.access: "public"` is already set — but if it does, that's the real requirement to check. |
| Need to publish from somewhere OIDC doesn't reach (local machine, other CI) | Fall back to a classic access token: mint one on npmjs.com, `gh secret set NODE_AUTH_TOKEN`, and add it to the `release-it` step's `env` in `release.yml`. |

---

## Publishing manually (without the workflow)

```bash
npm login
bun run build
npm publish            # registry is npm's default (registry.npmjs.org);
                        # OIDC trusted publishing only works from a
                        # supported CI (GitHub Actions), so a local publish
                        # authenticates via your npm login instead
```

[1]: https://docs.npmjs.com/trusted-publishers/
