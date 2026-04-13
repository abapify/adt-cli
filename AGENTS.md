<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# AGENTS.md

AI agent conventions for the **abapify / adt-cli** monorepo.

## Repository at a Glance

| Item             | Value                                                              |
| ---------------- | ------------------------------------------------------------------ |
| Package manager  | **bun workspaces** — use `bun`/`bunx`, not `npm`, `pnpm` or `yarn` |
| Monorepo tooling | **Nx 22**                                                          |
| Language         | **TypeScript 5 strict ESM**                                        |
| Build tool       | **tsdown** (per package)                                           |
| Test runner      | **Vitest** (some packages use Jest)                                |
| Lint             | **ESLint 10** + Prettier                                           |

## Essential Commands

```bash
bunx nx build [package]       # build one or all packages
bunx nx test [package]        # run tests
bunx nx typecheck             # full type check
bunx nx lint                  # lint (auto-fix)
bunx nx format:write          # REQUIRED before every commit
```

## Monorepo Layout

```
/
├── packages/              # All publishable packages (@abapify/*)
├── samples/               # Example projects
├── tools/                 # Nx plugins/tools
├── openspec/              # Specs and changes (source of truth)
├── .agents/rules/         # AI agent rules (symlinked to .windsurf/rules/ and .cognition/rules/)
├── docs/                  # Architecture docs
└── tmp/                   # Scratch files (gitignored)
```

## Dependency Graph

```
adt-cli
  └── adt-client ──► adt-contracts ──► adt-schemas ──► @abapify/ts-xsd
  └── adk        ──► adt-schemas
  └── adt-auth   ──► browser-auth ──► adt-playwright / adt-puppeteer
  └── adt-config
  └── plugins:  adt-atc, adt-export, adt-plugin-abapgit
                └── adt-plugin (interface)
```

Foundation packages (no `@abapify` deps): `ts-xsd`, `speci`, `logger`, `acds`.

## Type Flow (Core Architecture)

```
SAP XSD files
  → ts-xsd (parse + type inference)
  → adt-schemas (schema literals as TypeScript exports)
  → adt-contracts (speci endpoint descriptors wrapping schemas)
  → adt-client (executes contracts, full type inference at call site)
```

## Session & Lock Architecture

SAP ADT uses a **security session protocol** for CSRF tokens. Locks are bound to the security session — a CSRF token obtained without the proper flow is invalid for lock/unlock.

**3-step flow** (implemented in `SessionManager.initializeCsrf()`):

1. `GET /sessions` + `x-sap-security-session: create` → security session + cookies
2. `GET /sessions` + `x-sap-security-session: use` + `x-csrf-token: Fetch` → CSRF token
3. `DELETE /sessions/<id>` + `x-sap-security-session: use` → free slot (token survives)

All subsequent requests include `x-sap-security-session: use`. SAP allows **1 security session per user** — always DELETE after getting the token.

**Lock flow**: `adt-locks/LockService` is the single lock implementation. All lock/unlock operations in `adk/model.ts`, `adt-export`, and CLI commands delegate to it. See [`packages/adt-client/AGENTS.md`](packages/adt-client/AGENTS.md) for full protocol details.

## Rules Index

All AI agent rules live in `.agents/rules/` (single source of truth).
Symlinked to `.windsurf/rules/` and `.cognition/rules/` for tool compatibility.

### Always On

| Rule                                                                                    | Description                                                 |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [`git/no-auto-commit`](.agents/rules/git/no-auto-commit.md)                             | Never commit or push without explicit user approval         |
| [`development/coding-conventions`](.agents/rules/development/coding-conventions.md)     | TS strict, ESM only, naming, formatting, import conventions |
| [`development/file-lifecycle`](.agents/rules/development/file-lifecycle.md)             | Generated/downloaded file guardrails                        |
| [`openspec/project-planning-memory`](.agents/rules/openspec/project-planning-memory.md) | OpenSpec workflow and project memory                        |
| [`verification/after-changes`](.agents/rules/verification/after-changes.md)             | Build, typecheck, test, lint, format checklist              |

### On Demand (model_decision)

| Rule                                                                                | Description                        |
| ----------------------------------------------------------------------------------- | ---------------------------------- |
| [`openspec/spec-first-then-code`](.agents/rules/openspec/spec-first-then-code.md)   | Check specs before coding          |
| [`development/tmp-folder-testing`](.agents/rules/development/tmp-folder-testing.md) | Use `tmp/` for scratch files       |
| [`development/package-versions`](.agents/rules/development/package-versions.md)     | Always install latest versions     |
| [`adt/adk-save-logic`](.agents/rules/adt/adk-save-logic.md)                         | ADK upsert/lock edge cases         |
| [`adt/adt-ddic-mapping`](.agents/rules/adt/adt-ddic-mapping.md)                     | DDIC object → schema mapping       |
| [`adt/xsd-best-practices`](.agents/rules/adt/xsd-best-practices.md)                 | XSD validity and builder rules     |
| [`nx/nx-monorepo-setup`](.agents/rules/nx/nx-monorepo-setup.md)                     | Package creation, config templates |
| [`nx/nx-circular-dependencies`](.agents/rules/nx/nx-circular-dependencies.md)       | Fix false circular dep issues      |

### File-Scoped (glob)

| Rule                                                                          | Glob      | Description                                |
| ----------------------------------------------------------------------------- | --------- | ------------------------------------------ |
| [`development/bundler-imports`](.agents/rules/development/bundler-imports.md) | `**/*.ts` | Extensionless imports for bundled packages |

## Known Gotchas

### bun.lock excluded from Nx file walker

`bun.lock` is in `.git/info/exclude` to prevent JFrog Artifactory URLs from reaching GitHub. Nx's Rust file walker uses the `ignore` crate, which reads `.git/info/exclude` but (unlike `git`) has **no concept of the git index** — tracked files matching ignore patterns are still skipped. This means Nx never sees the lockfile and `externalNodes` in the project graph is empty.

**Consequence**: Any Nx plugin that infers `{ externalDependencies: [...] }` in target inputs will fail. The `@nx/eslint/plugin` does this for the `lint` target.

**Workaround**: The `lint` target's inputs are overridden in `nx.json` `targetDefaults` to drop `externalDependencies`. If a new plugin introduces similar inputs, add the same override for that target.

**Do NOT**: Remove `bun.lock` from `.git/info/exclude` — the JFrog constraint is intentional.

## Package-Level Guides

Each package has its own `AGENTS.md` with detailed conventions:

- [`packages/adk/AGENTS.md`](packages/adk/AGENTS.md) — ABAP Development Kit, object CRUD, save/lock flow, ETag management
- [`packages/acds/AGENTS.md`](packages/acds/AGENTS.md) — ABAP CDS parser, tokenizer, AST types
- [`packages/adt-cli/AGENTS.md`](packages/adt-cli/AGENTS.md) — CLI commands, service pattern, client initialization
- [`packages/adt-client/AGENTS.md`](packages/adt-client/AGENTS.md) — Contract-driven REST client, schema conventions, type inference
- [`packages/adt-contracts/AGENTS.md`](packages/adt-contracts/AGENTS.md) — Contract testing framework, schema integration
- [`packages/adt-schemas/AGENTS.md`](packages/adt-schemas/AGENTS.md) — XSD-derived schemas, generation pipeline
- [`packages/adt-mcp/AGENTS.md`](packages/adt-mcp/AGENTS.md) — MCP server: tool conventions, schema rules, mock server, extension guide
- [`packages/adt-plugin-abapgit/AGENTS.md`](packages/adt-plugin-abapgit/AGENTS.md) — abapGit serialization, handler template
- [`packages/ts-xsd/AGENTS.md`](packages/ts-xsd/AGENTS.md) — W3C XSD parser, type inference, codegen
- [`packages/adt-auth/AGENTS.md`](packages/adt-auth/AGENTS.md) — Auth methods, browser SSO
- [`packages/adt-fixtures/AGENTS.md`](packages/adt-fixtures/AGENTS.md) — Test fixtures

<!-- nx configuration end-->
