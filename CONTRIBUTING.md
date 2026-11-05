# Contributing to abapify

Thanks for helping. This guide covers how the repository is organised, how to build and test it, and how changes get released. For **using** abapify, see the [user documentation](https://adt-cli.netlify.app).

## Development setup

Requirements: [Bun](https://bun.sh/) and Node.js 22+. The repository uses Bun workspaces with the `workspace:*` protocol — do not use npm, pnpm or yarn inside it.

```bash
git clone https://github.com/abapify/adt-cli.git
cd adt-cli
bun install
```

Every task runs through [Nx](https://nx.dev):

```bash
bunx nx run-many -t build test typecheck lint   # every package
bunx nx run-many -t lint -- --fix                 # lint with auto-fix
bunx nx format:write                            # Prettier — run before every commit
bunx nx run adt-cli:test                        # a single project
bunx nx affected -t lint test build e2e-ci      # affected tasks run by CI; CI also checks format and dependencies
```

Run the CLI you just built with `node packages/adt-cli/dist/bin/adt.mjs …`.

## Repository layout

```
adt-cli/
├── packages/   # every @abapify/* package (one Nx project each)
├── website/    # Docusaurus user documentation → adt-cli.netlify.app
├── docs/       # maintainer docs: architecture, roadmap, deployment, design history
├── openspec/   # behaviour specs and in-flight change proposals
├── samples/    # example consumer projects
├── tools/      # internal tooling (npm trusted publishing, deps check, release helpers)
└── .agents/    # rules, skills and workflows for AI coding agents
```

Start with [`docs/architecture/overview.md`](./docs/architecture/overview.md) to understand how the packages fit together.

## Conventions

- **TypeScript strict, ESM only.** No `require()`, no `__dirname`; no `any` without a comment explaining why.
- **Schema-driven ADT access.** New endpoints get an XSD → schema → contract → fixture chain; see the `add-endpoint` skill in [`.agents/`](./.agents) and [`docs/architecture/contracts-pipeline.md`](./docs/architecture/contracts-pipeline.md).
- **Generated files are never edited by hand** — `packages/*/src/schemas/generated/**`, downloaded SAP XSDs in `packages/adt-schemas/.xsd/sap/**`, and `dist/`. Fix the generator or the source instead.
- **CLI stream contract.** stdout carries only the command payload; progress and diagnostics go to stderr.
- **Spec first.** Behaviour changes to spec-driven packages start in [`openspec/`](./openspec).
- **Docs ship with features.** A new command, MCP tool, package or config option updates the [`website/`](./website) in the same PR; package READMEs stay short and link to the site.
- **Conventional commits** (`feat(adt-cli): …`, `fix(adk): …`) — the release changelog is generated from them.

Coding agents: [`AGENTS.md`](./AGENTS.md) and [`.agents/repo-guide.md`](./.agents/repo-guide.md) are the canonical rules.

## Testing

- Unit and integration tests run against an in-process mock ADT server (`createMockAdtServer()` from `@abapify/adt-fixtures`) — no SAP system needed. See [`docs/architecture/mock-server.md`](./docs/architecture/mock-server.md).
- A real-system suite is skipped unless a session file is present; write tests additionally require `ADT_REAL_E2E_WRITE=1`. See [`docs/architecture/real-e2e.md`](./docs/architecture/real-e2e.md).

## Pull requests

1. Branch from `main` (`feat/…`, `fix/…`, `docs/…`).
2. Make the change, with tests and docs.
3. Run `bunx nx affected -t lint test build e2e-ci` and `bunx nx format:check`.
4. Open a pull request against `main`. CI must be green before merge.

## Releases

All packages are versioned and released together. Maintainers trigger the **Release** workflow on GitHub Actions; it computes the next version from conventional commits, tags, and dispatches `publish.yml`, which by default publishes only affected public packages to npm through **OIDC trusted publishing** — no `NPM_TOKEN` exists anywhere. Run `publish.yml` with `affected_only=false` to publish every public package. See [`tools/nx-npm-trust`](./tools/nx-npm-trust/README.md) for how trusted publishers are registered.

## Security

Please report vulnerabilities privately as described in [`SECURITY.md`](./SECURITY.md).
