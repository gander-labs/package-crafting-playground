# How to publish `@gander-labs/package-crafting-playground` to Verdaccio

Step-by-step: generate a registry token, store it as a repo secret, and run
the release workflow that publishes to <https://verdaccio.gander.dev/>.

- **Registry:** `https://verdaccio.gander.dev/`
- **Package:** `@gander-labs/package-crafting-playground`
- **Workflow:** `.github/workflows/release.yml` (manual, `workflow_dispatch`)

> **Status:** live. First release through this pipeline was
> `@gander-labs/package-crafting-playground@0.3.1` (tag `v0.3.1`). The `NODE_AUTH_TOKEN` secret is
> already set on the repo — steps 2–3 are only needed to rotate it.

---

## 1. Prerequisites

- An account on the Verdaccio instance (username + password).
- `npm` available locally (only to mint the token).
- Push access to `gander-labs/package-crafting-playground` and permission to manage its
  Actions secrets and variables. The [`gh`](https://cli.github.com/) CLI is
  optional but used in the examples.
- The repo variable `NPM_REGISTRY_URL` set to `https://verdaccio.gander.dev/`
  (`gh variable set NPM_REGISTRY_URL -R gander-labs/package-crafting-playground -b
  "https://verdaccio.gander.dev/"`) — the workflow reads it for
  `setup-node`'s `registry-url`. It is a plain variable, not a secret,
  since a registry URL isn't sensitive.

---

## 2. Generate a Verdaccio auth token

You need a **bearer token** the registry accepts. Pick one method.

### Option A — `npm login` (recommended)

```bash
npm login --registry https://verdaccio.gander.dev/
# enter username / password (and email if asked)
```

This writes the token into your user `~/.npmrc`. Read it back:

```bash
npm config get //verdaccio.gander.dev/:_authToken
```

Copy the printed value — that is the token.

### Option B — direct API call

```bash
USER=your-username
PASS=your-password

curl -sS -X PUT \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(printf '%s:%s' "$USER" "$PASS" | base64)" \
  -d "{\"name\":\"$USER\",\"password\":\"$PASS\",\"type\":\"user\",\"roles\":[],\"date\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"}" \
  https://verdaccio.gander.dev/-/user/org.couchdb.user:$USER
```

Response contains `"token": "…"`. That string is the token.

> The `Authorization: Basic` header is required — without it the request is
> treated as a new registration and rejected with `user registration disabled`.

### Verify the token works

```bash
curl -sS -H "Authorization: Bearer <TOKEN>" https://verdaccio.gander.dev/-/whoami
# -> {"username":"your-username"}
```

Verdaccio legacy tokens do not expire on their own, but rotating the server
secret invalidates them — if publishing starts returning `401`, mint a new
one and repeat step 3.

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

No other secret or variable is needed. `GITHUB_TOKEN` is provided
automatically by Actions.

---

## 4. How the workflow is wired (already committed)

You do not need to change anything here — this is what makes the publish
target Verdaccio.

**`package.json`**

```json
"bin":   { "package-crafting-playground": "dist/package-crafting-playground.js" },
"files": ["dist/package-crafting-playground.js"],
"publishConfig": {
  "access": "public",
  "registry": "https://verdaccio.gander.dev/"
}
```

`bin` makes the package runnable via `npx`; `files` is what pulls the
(git-ignored) `dist/package-crafting-playground.js` into the tarball. `npm publish` (invoked
by release-it) reads `publishConfig.registry`, so it always targets the
private registry.

**`.release-it.json`**

```json
"npm": {
  "publish": true,
  "skipChecks": true,
  "publishArgs": "--provenance"
}
```

`publish: true` turns the npm publish step on; `skipChecks: true` skips
release-it's registry ping / `whoami` preflight (which is fussy against a
private registry). `publishArgs: "--provenance"` makes `npm publish` attach a
[provenance attestation](https://docs.npmjs.com/generating-provenance-statements)
— a signed statement (via Sigstore, using the job's GitHub Actions OIDC
token — the same `id-token: write` permission JSR's publish uses) proving
the package was built from this exact repo/workflow/commit, the npm
equivalent of what `deno publish` already does by default on JSR.

> Attestation storage is a registry-side feature. If Verdaccio's version
> here doesn't support the `/-/npm/v1/security/attestations` endpoint,
> `npm publish --provenance` fails on that step — drop `--provenance` from
> `publishArgs` if so, rather than fighting the registry.

**`.github/workflows/release.yml`**

```yaml
- name: Setup Node
  uses: actions/setup-node@…
  with:
    node-version: 24
    registry-url: ${{ vars.NPM_REGISTRY_URL }}   # writes .npmrc

- name: release-it
  run: bunx release-it ${{ inputs.bump }} --ci
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NODE_AUTH_TOKEN: ${{ secrets.NODE_AUTH_TOKEN }}     # <- the token from step 3
```

`registry-url` makes `setup-node` write a job-local `.npmrc`:

```
//verdaccio.gander.dev/:_authToken=${NODE_AUTH_TOKEN}
```

so `npm publish` authenticates with `NODE_AUTH_TOKEN`. `npm publish` reads the
target registry from `publishConfig.registry` in `package.json`.

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
6. `npm publish --provenance` → `@gander-labs/package-crafting-playground@X.Y.Z` to
   Verdaccio, with a signed provenance attestation attached,
7. `git push` of the commit + tag,
8. `deno publish` → `@gander-labs/package-crafting-playground@X.Y.Z` to JSR (OIDC, no
   token — see [Publishing to JSR](#publishing-to-jsr) below),
9. creates a GitHub Release with the three compiled binaries attached.

If step 6 fails, release-it rolls back steps 4–5 (no tag, no commit pushed).

---

## 6. Verify

```bash
# latest published version
npm view @gander-labs/package-crafting-playground version \
  --registry https://verdaccio.gander.dev/

# full dist-tags / metadata
curl -sS https://verdaccio.gander.dev/@gander-labs%2fpackage-crafting-playground \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["dist-tags"], list(d["versions"]))'
# -> {'latest': '0.3.1'} ['0.3.1']
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
npx --registry https://verdaccio.gander.dev/ \
  --yes @gander-labs/package-crafting-playground@latest --version
```

---

## 7. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `npm error code ENEEDAUTH` / `need auth This command requires you to be logged in` | `NODE_AUTH_TOKEN` secret is **not set** (empty `NODE_AUTH_TOKEN`). Add it (step 3). The workflow's "Check publish token" step now fails fast with this message. |
| `npm ERR! 401 Unauthorized` on publish | `NODE_AUTH_TOKEN` is set but wrong or rotated. Re-mint (step 2), re-set the secret (step 3). |
| `npm ERR! 403 … not allowed to publish` | The package name is owned by someone else on the registry, or access rules block it. Confirm the name is `@gander-labs/package-crafting-playground`. |
| `EPUBLISHCONFLICT` / `cannot publish over previously published version` | That version already exists. Bump again (run the workflow with `patch`). |
| release-it stops at a registry check | Ensure `.release-it.json` has `"skipChecks": true`. |
| Works locally, fails in CI | Local uses your `~/.npmrc`; CI uses `NODE_AUTH_TOKEN`. The CI token must be valid independently. |
| `npm error 404 Not Found - PUT .../-/npm/v1/security/attestations` (or similar) on publish | Verdaccio here doesn't support storing provenance attestations. Drop `--provenance` from `.release-it.json`'s `npm.publishArgs`. |
| `npm error "provenance" is only supported when publishing packages with public access` | Shouldn't happen — `publishConfig.access: "public"` is already set — but if it does, that's the real requirement to check. |

---

## Publishing manually (without the workflow)

```bash
npm login --registry https://verdaccio.gander.dev/
bun run build
npm publish            # registry comes from publishConfig; no --provenance here —
                        # it needs a supported CI's OIDC token (GitHub Actions),
                        # not a local login
```
