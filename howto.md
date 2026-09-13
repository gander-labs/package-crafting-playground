# How to publish `@gander-labs/package-crafting-playground` to npm

Step-by-step: generate an npm access token, store it as a repo secret, and run
the release workflow that publishes to <https://registry.npmjs.org/>.

- **Registry:** `https://registry.npmjs.org/`
- **Package:** `@gander-labs/package-crafting-playground`
- **Workflow:** `.github/workflows/release.yml` (manual, `workflow_dispatch`)

---

## 1. Prerequisites

- An npmjs.com account with publish access to the `@gander-labs` scope.
- `npm` available locally (only to mint the token).
- Push access to `gander-labs/package-crafting-playground` and permission to manage its
  Actions secrets. The [`gh`](https://cli.github.com/) CLI is optional but
  used in the examples.

---

## 2. Generate an npm access token

Create a **Granular Access Token** (or classic **Automation** token) scoped to
publish `@gander-labs/package-crafting-playground`:

1. <https://www.npmjs.com/> → avatar → **Access Tokens** → **Generate New Token**
   → **Granular Access Token**.
2. Set **Packages and scopes** → **Read and write**, restricted to this
   package (or the `@gander-labs` scope).
3. No expiration is needed for a CI secret, but rotate it periodically.

Automation tokens (classic UI) work the same way and bypass 2FA prompts,
which is what a non-interactive CI run needs.

### Verify the token works

```bash
npm whoami --//registry.npmjs.org/:_authToken=<TOKEN>
```

---

## 3. Store the token as the `NODE_AUTH_TOKEN` repo secret

The workflow reads `${{ secrets.NODE_AUTH_TOKEN }}`.

### With `gh`

```bash
gh secret set NODE_AUTH_TOKEN -R gander-labs/package-crafting-playground
# paste the token when prompted (no echo)

gh secret list -R gander-labs/package-crafting-playground   # confirm NODE_AUTH_TOKEN is listed
```

### With the web UI

`Settings` → `Secrets and variables` → `Actions` → `New repository secret`

- **Name:** `NODE_AUTH_TOKEN`
- **Secret:** the token from step 2

No other secret is needed. `GITHUB_TOKEN` is provided automatically by
Actions.

---

## 4. How the workflow is wired (already committed)

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
- name: Setup Node
  uses: actions/setup-node@…
  with:
    node-version: 26
    registry-url: https://registry.npmjs.org

- name: release-it
  run: bunx release-it ${{ inputs.bump }} --ci
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NODE_AUTH_TOKEN: ${{ secrets.NODE_AUTH_TOKEN }}     # <- the token from step 3
```

`registry-url` makes `setup-node` write a job-local `.npmrc`:

```
//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}
```

so `npm publish` (invoked by release-it) authenticates with `NODE_AUTH_TOKEN`.

Set the repo variable `NPM_PROVENANCE` to `true` to have the workflow attach
a [provenance attestation](https://docs.npmjs.com/generating-provenance-statements)
via `--npm.publishArgs=--provenance` — a signed statement (via Sigstore,
using the job's GitHub Actions OIDC token, the same `id-token: write`
permission JSR's publish uses) proving the package was built from this exact
repo/workflow/commit. Fully supported on the public npm registry.

---

## 5. Run a release

1. GitHub → **Actions** → **Release** → **Run workflow**.
2. Choose the version bump: `patch`, `minor`, or `major`.
3. **Run workflow**.

The job then:

1. `Check publish token` — fails fast if `NODE_AUTH_TOKEN` is missing,
2. runs the `Code` workflow (lint / typecheck / tests),
3. `Build and verify artifacts` — `bun run build` and smoke-test all three
   outputs by actually running `--version` (sanity check before any version
   bump),
4. `npm version` bumps `package.json`, then release-it commits it as
   `chore: release vX.Y.Z` and tags `vX.Y.Z`,
5. `after:bump` hook syncs `jsr.json`'s version to match and re-runs
   `bun run build`,
6. `npm publish` → `@gander-labs/package-crafting-playground@X.Y.Z` to npm,
7. `git push` of the commit + tag,
8. `deno publish` → `@gander-labs/package-crafting-playground@X.Y.Z` to JSR (OIDC, no
   token — see [Publishing to JSR](#publishing-to-jsr) below),
9. creates a GitHub Release with the three compiled binaries attached.

If step 6 fails, release-it rolls back steps 4–5 (no tag, no commit pushed).

---

## 6. Verify

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

## 7. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `npm error code ENEEDAUTH` / `need auth This command requires you to be logged in` | `NODE_AUTH_TOKEN` secret is **not set** (empty `NODE_AUTH_TOKEN`). Add it (step 3). The workflow's "Check publish token" step now fails fast with this message. |
| `npm ERR! 401 Unauthorized` on publish | `NODE_AUTH_TOKEN` is set but wrong or rotated. Re-mint (step 2), re-set the secret (step 3). |
| `npm ERR! 403 … not allowed to publish` | The `@gander-labs` scope/package is owned by a different npm account, or the token lacks publish access to it. Confirm the name is `@gander-labs/package-crafting-playground` and the token's scope grants. |
| `EPUBLISHCONFLICT` / `cannot publish over previously published version` | That version already exists. Bump again (run the workflow with `patch`). |
| Works locally, fails in CI | Local uses your `~/.npmrc`; CI uses `NODE_AUTH_TOKEN`. The CI token must be valid independently. |
| `npm error "provenance" is only supported when publishing packages with public access` | Shouldn't happen — `publishConfig.access: "public"` is already set — but if it does, that's the real requirement to check. |

---

## Publishing manually (without the workflow)

```bash
npm login
bun run build
npm publish            # registry is npm's default (registry.npmjs.org);
                        # no --provenance here — it needs a supported CI's
                        # OIDC token (GitHub Actions), not a local login
```
