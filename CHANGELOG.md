# Changelog

All notable changes to this project will be documented in this file.

## [0.3.4] - 2026-09-12

### Bug Fixes

- Switch to AGPL-3.0-only
- Gate npm provenance on NPM_PROVENANCE var

### CI

- Link to CHANGELOG.md from release notes and summary
- Build and verify both compiled executables
- Build and verify the Deno compiled executable

### Documentation

- Split template setup into TEMPLATE.md, shrink README
- Document repo settings for branch protection, Dependabot, secrets
- Add Dependabot->Renovate migration, fix free-plan security wording
- Document the two compiled executables
- Document the Deno compiled executable
- Document the JSR publish channel
- Add SPDX headers and a README License section

### Features

- Add Node SEA executable alongside Bun compile
- Add Deno compile executable
- Add JSR as a second publish channel
- Enable npm provenance attestation

### Miscellaneous

- Release v0.3.4

### Style

- Fix biome formatting in build-exe-node.mjs

## [0.3.3] - 2026-09-12

### CI

- Drop unsupported always-auth input from setup-node (v7 rejects it)
- Pin bun to exact 1.4.0 instead of a floating range
- Move npm registry URL to repo variable, rename token secret
- Set artifact retention-days to 3 days
- Fall back to old registry URL and secret until rotated
- Generate CHANGELOG.md via git-cliff

### Miscellaneous

- Release v0.3.3

## [0.3.2] - 2026-09-10

### Documentation

- Mark publish pipeline live, refresh verify steps and tarball note

### Miscellaneous

- Release v0.3.2

### Build

- Ship a runnable Node bin on npm, keep compiled binary for Releases

## [0.3.1] - 2026-09-10

### Bug Fixes

- Authenticate self-update requests for private repo

### CI

- Drop ENFORCE_AUDIT and ARTIFACT_RETENTION_DAYS toggles
- Publish @gander-labs/new-bun-app to verdaccio.gander.dev
- Fail fast when NPM_TOKEN secret is missing

### Documentation

- Document self-update auth contract and public-repo behaviour
- Howto for minting a Verdaccio token and running the release

### Miscellaneous

- Release v0.3.1

## [0.3.0] - 2026-09-08

### Miscellaneous

- Release v0.3.0

## [0.2.5] - 2026-09-08

### CI

- Slim scheduled runs to a weekly canary and drop cleanup.yml
- Read job.status from env in the CI summary step
- Drop the ENFORCE_SHA_PINNING toggle from the zizmor job
- Drop the duplicate build step from the release workflow

### Documentation

- Prune obsolete repository variables from the README

### Miscellaneous

- Rename the compile script to build
- Release v0.2.5

### Refactor

- Drop the gh CLI self-update path

### Testing

- Drop the redundant compiled-binary smoke test

## [0.2.4] - 2026-09-08

### Documentation

- Explain why the no-args path avoids reading argv directly
- Note TODO to adopt @optique/testing once stable

### Features

- Show help by default and add --help option

### Miscellaneous

- Release v0.2.4

### Refactor

- Detect no-args via run() return instead of Bun.argv
- Replace Bun-only APIs with node: equivalents
- Use numeric localeCompare for version ordering

### Testing

- Assert bare CLI invocation writes a non-empty response
- Smoke-test the bun build --compile binary

## [0.2.3] - 2026-09-08

### CI

- Pin actions to SHA and drop the frizbee job
- Clear remaining zizmor findings so the audit passes
- Enforce SHA pinning by default in workflow.yml
- Silence GitHub Actions annotations
- Restrict push trigger to main to stop double runs on PR branches

### Features

- Add lefthook as the reference dev-hook standard

### Miscellaneous

- Release v0.2.3

## [0.2.2] - 2026-09-08

### Miscellaneous

- Release v0.2.2

## [0.2.1] - 2026-09-07

### Bug Fixes

- Set GH_REPO in cleanup-runs.yml so gh can find the repo
- Resolve shellcheck failures in release.yml flagged by actionlint
- Make frizbee step non-blocking like zizmor
- Move summary interpolation to env var in code.yml
- Move summary interpolation to env vars in release.yml

### CI

- Add commented npm publish alternatives to release.yml
- End ci.yml and release.yml with a step summary
- Lint workflow files with actionlint
- Delete old completed workflow runs weekly
- Bound cleanup-runs.yml runtime with job and step timeouts
- Cap runs deleted per cleanup-runs.yml execution
- Parameterize ci.yml artifact retention, document cron limitation
- Make ci.yml and release.yml summaries run on failure too
- Name every job and step across all workflows
- Add Zizmor and frizbee workflows for workflow-file security
- Harden actionlint.yml and ci.yml checkout and permissions
- Regroup workflows by concern (Code, CI/Workflow, cleanup, release)
- Gate release on Code, run every job on every trigger
- Add ENFORCE_SHA_PINNING var to gate zizmor unpinned-uses failures
- Configure npm auth before publish in release workflow
- Drop --registry from npm publish to fix ENEEDAUTH
- Publish via release-it npm plugin instead of manual npm publish
- Stop npm registry publish, pin bun and node versions

### Documentation

- Translate README to English, drop em dashes, add light emoji
- Document how to switch this template to a non-compiled Bun app
- Document recommended GitHub security settings
- Document Zizmor and frizbee workflows
- Trim README to template rename, security setup, and vars
- Document local Verdaccio publish testing in README
- Translate README to English, document ENFORCE_SHA_PINNING
- Document Verdaccio token creation procedure in README

### Miscellaneous

- Drop private flag so the package can be published
- Sync version to 0.2.0 (already published to registry)
- Release v0.2.1

## [0.2.0] - 2026-09-05

### CI

- Fold Biome quality checks into ci.yml
- Track bun.lock and run a daily audit schedule
- Upload build artifact with 30-day retention, document customization points

### Style

- Apply Biome formatting to update.ts

## [0.1.0] - 2026-09-05

### CI

- Add CI, code quality, and release workflows

### Documentation

- Note early .gitignore cleanup in README

### Features

- Add Optique CLI with self-update command

### Miscellaneous

- Scaffold Bun project with Biome and TypeScript


