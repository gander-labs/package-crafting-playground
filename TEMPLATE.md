# Using this template

Instructions for turning `package-crafting-playground` into a real project: what to
rename, what to configure, and which pieces are optional.

## Turning this template into a new project

The name `package-crafting-playground` (and the full path `gander-labs/package-crafting-playground`) shows
up in several places and needs to be changed everywhere:

- `package.json`: the `"name"` field and the outfiles in the
  `"build:bin:bun"` / `"build:bin:node"` / `"build:bin:deno"` scripts
  (`dist/package-crafting-playground-bun`, `dist/package-crafting-playground-node`, `dist/package-crafting-playground-deno`)
- `README.md`: the heading (project title)
- `update.ts`: the `REPO` constant (`gander-labs/package-crafting-playground`) and the
  `ASSET_NAME` constant (already runtime-aware — `package-crafting-playground-bun` /
  `package-crafting-playground-node` / `package-crafting-playground-deno` — only the base name needs renaming)
- `.release-it.json`: `github.assets` (`dist/package-crafting-playground-bun`,
  `dist/package-crafting-playground-node`, `dist/package-crafting-playground-deno`)
- `.github/workflows/code.yml`: `name`/`path` in the
  `actions/upload-artifact` step
- `jsr.json`: the `"name"` field — and re-link the renamed package on
  <https://jsr.io> to this repo's `release.yml` (see howto.md, "Publishing
  to JSR"), since the OIDC link is keyed to the package name

SHA-pinning is enforced — the Zizmor job in `workflow.yml` fails if a
floating action tag (e.g. `@v7`) is ever reintroduced.

## Self-update (`app update`)

`update.ts` downloads the compiled binary from a **GitHub Release** of
`REPO` and overwrites the running executable, so self-update only works
for a project that ships that way (the `release.yml` workflow here does).
Strip the release workflow and the `update` command has nothing to fetch.

Auth is via the `GITHUB_TOKEN` or `GH_TOKEN` env var and is **optional**:

- **Public repo** — no token needed; anonymous GitHub API calls (60/hour)
  are plenty for occasional updates. A token still helps if users hit the
  rate limit.
- **Private repo** — a token with `contents: read` is **required**. The
  GitHub API answers anonymous requests to a private repo with `404`, so
  without a token `update` fails with "Failed to fetch release: 404".

## Security setup without its own workflow

These are repository settings, not files in the repo — turned on once per
new project under **Settings -> Code security**.

**Dependabot alerts + security updates** (free on both public and private
repos, no `dependabot.yml` needed):

1. Settings -> Code security -> **Dependabot**.
2. **Enable** next to **Dependabot alerts** (scans dependencies for known
   CVEs).
3. **Enable** next to **Dependabot security updates** (auto-PR with a fix,
   if a patched version is available).
4. Confirm **Dependency graph** is enabled (usually on by default).

**Code scanning (CodeQL) and Secret scanning / push protection**: same
Settings page, sections **Code scanning** and **Secret scanning** ->
**Enable**/**Set up**. Free on public repos; on a **private** repo on a
Free plan they're not available at all (button leads to an upsell). If
the project stays private — skip these.

**Immutable releases** (GA since October 2025): Settings -> scroll to
**Releases** -> **Enable release immutability**. Once on, every *future*
release's tags and assets can no longer be modified or deleted — locks in
the supply-chain guarantee that a published release is what it says it is.
Existing releases are unaffected; org admins can also default this on for
all repos under org Settings -> Repository -> General -> **Releases**.

## Ustawienia repozytorium w nowym interfejsie GitHub

Wszystko poniżej to ustawienia repo (zakładka **Settings**), nie pliki w
repo — konfiguruje się raz per nowy projekt.

### Ochrona gałęzi `main` (Branch protection / Rulesets)

GitHub ma dziś dwa miejsca na to samo — **Rulesets** to nowszy, zalecany
interfejs, klasyczne **Branch protection rules** wciąż działają:

- **Rulesets (nowy interfejs)**: Settings -> **Rules** -> **Rulesets** ->
  **New ruleset** -> **New branch ruleset**. Ustaw target `main` (branch
  targeting criteria -> Include default branch), Enforcement status:
  **Active**.
- **Stary interfejs**: Settings -> **Branches** -> **Add branch protection
  rule**, branch name pattern `main`.

W obu miejscach włącz:

- **Require a pull request before merging** (blokuje bezpośredni push do
  `main`).
- **Require status checks to pass before merging** — zaznacz konkretne
  joby z workflowów tego repo, żeby PR-a nie dało się zmergować bez
  zielonego CI: **Code Checks** (`code.yml` — test, typecheck, `bun audit`,
  Biome, build), **Actionlint** i **Zizmor** (`workflow.yml` — lint
  workflowów i pilnowanie SHA-pinningu akcji).
- **Require branches to be up to date before merging**, jeśli chcesz
  wymusić rebase/merge z `main` przed mergem PR-a.
- Opcjonalnie **Require approvals** (min. 1 review) i **Do not allow
  bypassing the above settings**, żeby reguła obejmowała też adminów.

### Automatyczne kasowanie gałęzi po zmergowaniu

Settings -> **General** -> sekcja **Pull Requests** -> zaznacz
**Automatically delete head branches**. Dotyczy tylko gałęzi
zmergowanych przez PR na GitHubie, nie ruszy `main` ani gałęzi
niezmergowanych.

### Dependabot — włączanie/wyłączanie

Settings -> **Code security** -> sekcja **Dependabot**:

- **Dependabot alerts** — przełącznik **Enable**/**Disable**, skanuje
  zależności pod kątem znanych CVE.
- **Dependabot security updates** — **Enable**/**Disable**, auto-PR z
  fixem, jeśli istnieje załatana wersja.
- **Dependabot version updates** — to jedyna część wymagająca pliku w
  repo (`.github/dependabot.yml`); ten projekt go nie ma, więc nie ma nic
  do wyłączenia.
- **Dependency graph** — zwykle włączony domyślnie, warunkuje działanie
  powyższych.

### Przejście z repo prywatnego na publiczne

Settings -> **General** -> na samym dole **Danger Zone** -> **Change
repository visibility** -> **Change visibility** -> **Make public**
(wymaga wpisania nazwy repo do potwierdzenia). Nieodwracalne bez
ponownego przełączenia z powrotem na private przez ten sam ekran.

Co się odblokowuje/zmienia po przejściu na public:

- **Code scanning (CodeQL)** i **Secret scanning + push protection**
  (Settings -> Code security) stają się darmowe — na private repo z
  planem Free w ogóle nie są dostępne. Włącz oba przez **Enable**/
  **Set up** w tych sekcjach.
- Anonimowe wywołania GitHub API (np. `update.ts` w tym repo) przestają
  wymagać tokenu — private zwraca `404` bez `GITHUB_TOKEN`/`GH_TOKEN`,
  public odpowiada normalnie (limit 60 req/h bez tokenu).
- OIDC Trusted Publishing do **publicznego** rejestru npm
  (`registry.npmjs.org`) staje się sensowną opcją zamiast
  `NODE_AUTH_TOKEN` — patrz sekcja "OIDC trusted publishing" niżej. Nie
  dotyczy to Verdaccio, którego ten projekt używa.

### Migracja Dependabot -> Renovate (przy uwolnieniu jako OSS)

Jeśli projekt po przejściu na public ma używać Renovate zamiast Dependabota:

1. **Wersje zależności**: usuń/nie twórz `.github/dependabot.yml` (Renovate
   przejmuje tę rolę) i zainstaluj GitHub App **Renovate** z Marketplace
   (na org albo tylko na to repo), z plikiem `renovate.json` /
   `.github/renovate.json` w repo.
2. **Alerty CVE**: **Dependabot alerts** (Settings -> Code security ->
   Dependabot) zostaw włączone — to inny mechanizm (samo wykrywanie), nie
   generuje PR-ów i Renovate go nie zastępuje.
3. **Auto-PR z fixem**: jeśli Renovate ma przejąć też ten obszar, wyłącz
   **Dependabot security updates** (ten sam ekran, przełącznik
   **Disable**) i włącz w konfiguracji Renovate `vulnerabilityAlerts: {
   "enabled": true }`, żeby reagował na te same alerty.

### Immutable releases

Settings -> scroll do **Releases** -> **Enable release immutability**.
Działa niezależnie od widoczności repo (public/private) i od momentu
włączenia dotyczy tylko przyszłych release'ów — tagi i assety nie idą już
do edycji ani usunięcia. Domyślne ustawienie dla całej organizacji:
org Settings -> Repository -> General -> **Releases**.

### Sekrety i zmienne (Secrets and variables)

Settings -> **Secrets and variables** -> **Actions**, dwie osobne
zakładki:

- **Secrets** -> **New repository secret** — wartości szyfrowane,
  niewidoczne w logach (np. `NODE_AUTH_TOKEN`, patrz howto.md).
- **Variables** -> **New repository variable** — jawny tekst, widoczny w
  UI i logach, do wartości nie-sekretnych (np. `NPM_REGISTRY_URL`,
  `ARTIFACT_RETENTION_DAYS` używane w `code.yml`/`release.yml`).

Ten sam ekran ma też zakładki **Environments** (sekrety/zmienne scope'owane
per środowisko, z opcjonalnym required reviewers) i **Codespaces**, jeśli
projekt tego kiedyś potrzebuje.

## Publishing to npm (Verdaccio)

See [howto.md](howto.md) for the step-by-step setup (registry token, repo
secret, what the release workflow does). The rest of this section covers
what changes per new project, and two alternatives worth knowing about.

### Provisioning a new project

Each new project needs its own registry identity, not a copy of this
one's:

- A **package scope/name** on the registry that isn't already taken
  (`@gander-labs/<name>`, see the rename checklist above).
- Its own `NODE_AUTH_TOKEN` secret (howto.md steps 2-3) — never reuse a
  token across projects; if one leaks or gets rotated, the blast radius
  should be one repo.
- The `NPM_REGISTRY_URL` repo variable (howto.md step 1), if it should
  ever differ from the shared `https://verdaccio.gander.dev/`.

### OIDC trusted publishing — not applicable here

npm's [Trusted Publishing][1] (GA since July 2025) lets a GitHub Actions
workflow publish without any stored token at all: npm exchanges the
workflow's OIDC identity for a short-lived credential. It removes the
"long-lived secret sitting in repo settings" risk entirely.

**This only works against the public registry (`registry.npmjs.org`)** —
there is no evidence Verdaccio implements the same OIDC exchange, so it
does not apply to this project's `verdaccio.gander.dev` setup. If a new
project publishes to the *public* npm registry instead, prefer OIDC over
`NODE_AUTH_TOKEN`: add `permissions: id-token: write` to the release job,
configure the Trusted Publisher on the npmjs.com package settings page,
and drop the `NODE_AUTH_TOKEN` secret and `registry-url` input entirely
(npm CLI ≥ 11.5.1 required).

### Local Verdaccio for dry-run testing

Before wiring up the real registry secret (or when debugging a publish
failure), run a throwaway registry locally instead of risking a bad
publish against the shared instance:

```bash
docker run --rm -it -p 4873:4873 verdaccio/verdaccio
npm publish --registry http://localhost:4873
```

This exercises the exact same `package.json`/`publishConfig` path without
touching `verdaccio.gander.dev` or consuming a real version number.

[1]: https://docs.npmjs.com/trusted-publishers/
