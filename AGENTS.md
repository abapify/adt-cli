<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# AGENTS.md

AI agent conventions for the **abapify / adt-cli** monorepo.

## Repository at a Glance

| Item | Value |
|------|-------|
| Package manager | **npm workspaces** — use `npm`, not `pnpm` or `yarn` |
| Monorepo tooling | **Nx 22** |
| Language | **TypeScript 5 strict ESM** |
| Build tool | **tsdown** (per package) |
| Test runner | **Vitest** (some packages use Jest) |
| Lint | **ESLint 10** + Prettier |

## Essential Commands

```bash
# Build
npx nx build               # all packages
npx nx build adt-cli       # single package

# Test
npx nx test                # all packages
npx nx test adt-cli        # single package
npx nx test adt-cli --watch  # watch mode

# Type check
npx nx typecheck

# Lint (auto-fix)
npx nx lint
```

## Monorepo Layout

```
/
├── packages/
│   ├── adt-cli/          # CLI binary (@abapify/adt-cli)
│   ├── adt-client/       # HTTP client (@abapify/adt-client)
│   ├── adt-contracts/    # API contracts (@abapify/adt-contracts)
│   ├── adt-schemas/      # XSD-derived schemas (@abapify/adt-schemas)
│   ├── adk/              # ABAP object kit (@abapify/adk)
│   ├── adt-auth/         # Auth methods (@abapify/adt-auth)
│   ├── adt-config/       # Config loader (@abapify/adt-config)
│   ├── adt-atc/          # ATC plugin (@abapify/adt-atc)
│   ├── adt-export/       # Export plugin (@abapify/adt-export)
│   ├── adt-plugin/       # Plugin interface (@abapify/adt-plugin)
│   ├── adt-plugin-abapgit/ # abapGit plugin (@abapify/adt-plugin-abapgit)
│   ├── browser-auth/     # Browser SSO core (@abapify/browser-auth)
│   ├── adt-playwright/   # Playwright adapter (@abapify/adt-playwright)
│   ├── adt-puppeteer/    # Puppeteer adapter (@abapify/adt-puppeteer)
│   ├── speci/            # Contract spec (speci)
│   ├── ts-xsd/           # XSD tools (ts-xsd)
│   ├── adt-codegen/      # Code gen (@abapify/adt-codegen)
│   ├── asjson-parser/    # asJSON parser (@abapify/asjson-parser)
│   └── logger/           # Logger (@abapify/logger)
├── samples/              # Example projects
├── tools/                # Nx plugins/tools
├── docs/                 # Architecture docs, specs, planning
└── tmp/                  # Local scratch files (gitignored)
```

## Package Naming Rules

- Cross-package imports: `@abapify/<package-name>`
- Exceptions (no scope): `speci`, `ts-xsd`, `adt-fixtures`
- Internal file imports: relative paths, no extension (`../utils/parse`)
- `workspace:*` is **not** supported by npm — use `"*"` for local deps

## Creating a New Package

```bash
npx nx g @nx/node:library --directory=packages/<name> --no-interactive
# then copy tsdown.config.ts from packages/sample-tsdown
# set "build": "tsdown" in package.json
```

Ensure `skipNodeModulesBundle: true` in `tsdown.config.ts`.

## Dependency Graph (simplified)

```
adt-cli
  └── adt-client ──► adt-contracts ──► adt-schemas ──► ts-xsd
  └── adk        ──► adt-schemas
  └── adt-auth   ──► browser-auth ──► adt-playwright / adt-puppeteer
  └── adt-config
  └── plugins:  adt-atc, adt-export, adt-plugin-abapgit
                └── adt-plugin (interface)
```

Foundation packages with no `@abapify` dependencies: `ts-xsd`, `speci`, `logger`.

## Key Architectural Decisions

### Type Flow

```
SAP XSD files
  → ts-xsd (parse + type inference)
  → adt-schemas (schema literals as TypeScript exports)
  → adt-contracts (speci endpoint descriptors wrapping schemas)
  → adt-client (executes contracts, full type inference at call site)
```

### Plugin System

CLI plugins are loaded from `adt.config.ts` → `commands` array. Each plugin exports a Commander.js `Command` object. Plugins must depend on `@abapify/adt-plugin` for the format interface.

### ADK Object Handlers

The ADK uses an `AdkObjectHandler` bridge pattern. Object types are registered with a parser function and a URL factory:

```typescript
this.handlers.set(
  'CLAS',
  (client) =>
    new AdkObjectHandler(
      client,
      (xml) => ClassAdtAdapter.fromAdtXML(xml),
      (name) => `/sap/bc/adt/oo/classes/${name.toLowerCase()}`,
    ),
);
```

### Auth Flow

1. CLI reads destination from `adt-config`
2. `adt-auth` `AuthManager` picks the matching auth method
3. For browser SSO: delegates to `adt-playwright` or `adt-puppeteer` (loaded as plugins)
4. Session cached in `~/.adt/sessions/<SID>.json`

## Coding Conventions

- **TypeScript strict** — no `any` without a comment explaining why
- **ESM only** — no `require()`, no `__dirname` (use `import.meta.url`)
- **No decorators** except in packages that already use them
- **Async/await** over Promises `.then()` chains
- PascalCase for types/classes/interfaces; camelCase for variables/functions
- 2-space indentation (Prettier enforced)

## Temporary Files

Always write scratch files, test output, and CLI output to `tmp/`:

```bash
adt get ZCL_TEST -o tmp/class.xml
```

The `tmp/` directory is gitignored.

## Spec-First Development

Specifications live in `docs/specs/`. Before implementing a new feature:

1. Check `docs/specs/` for an existing spec
2. If one exists, align implementation to it
3. If adding a new pattern, create or update the relevant spec

Key specs:
- `docs/specs/cicd/abap-cicd-pipeline.md` — CI/CD architecture
- `docs/specs/oat/` — OAT file format
- `docs/specs/adt-cli/` — CLI design decisions

## After Making Changes

```bash
npx nx build <package>   # verify it compiles
npx nx typecheck         # full type check
npx nx test <package>    # run tests
npx nx lint              # fix lint issues
```

<!-- nx configuration end-->

