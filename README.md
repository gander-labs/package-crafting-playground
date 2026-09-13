# package-crafting-playground

A Bun CLI starter template: TypeScript CLI built with
[Optique](https://github.com/dahlia/optique), self-update via GitHub
Releases, and a CI/release pipeline that publishes to npm and attaches a
compiled binary to each release.

## Quick start

```bash
bun install
bun run index.ts --help
bun test
bun run build
```

## Docs

- [TEMPLATE.md](TEMPLATE.md) — turning this template into a new project
  (what to rename, what to configure).
- [howto.md](howto.md) — publishing to npm (Verdaccio) and JSR.
- [CHANGELOG.md](CHANGELOG.md) — release history.

## License

[AGPL-3.0-only](LICENSE) — modified versions run as a network service must
also make their source available to users of that service.
