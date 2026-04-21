# abapify — ADT CLI & SDK for SAP

[![CI](https://github.com/abapify/adt-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/abapify/adt-cli/actions/workflows/ci.yml)
[![adt-cli on npm](https://img.shields.io/npm/v/%40abapify%2Fadt-cli.svg?label=%40abapify%2Fadt-cli)](https://www.npmjs.com/package/@abapify/adt-cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**abapify** is a TypeScript monorepo that talks to [SAP ABAP Development
Tools (ADT)](https://help.sap.com/docs/ABAP_PLATFORM_NEW/c238d694b825421f940829321ffa326a/4ec8641126391014adc9fffe4e204223.html).
It ships a CLI (`adt`), a typed SDK for programmatic use, an MCP server
that exposes ADT to AI assistants, and a handful of CLI plugins for
common workflows (ATC, abapGit, gCTS, unit tests, diff, export).

Why it exists: SAP ADT is a rich REST surface, but there's no
first-class CLI or npm SDK for it. `abapify` gives you one — typed,
scriptable, CI-friendly, without leaving the JS ecosystem.

## Quick start

### CLI

```bash
# Install
npm i -g @abapify/adt-cli
# or, run it one-shot
npx @abapify/adt-cli --help

# Configure a connection
adt login --url https://your-sap-system.example.com

# Do things
adt search "Z*" --type class
adt get class ZCL_MY_CLASS
adt atc run --package ZMYPKG --output sarif
adt export push ./src        # deploy local source to SAP
adt abapgit push              # serialize & push via abapGit
```

See the [CLI reference](https://adt-cli.netlify.app/cli/overview) for
every command and flag.

### SDK

```bash
npm i @abapify/adt-client @abapify/adt-auth
```

```ts
import { createAdtClient } from '@abapify/adt-client';
import { basicAuth } from '@abapify/adt-auth';

const client = createAdtClient({
  baseUrl: 'https://your-sap-system.example.com',
  auth: basicAuth({ user: 'DEVELOPER', password: process.env.SAP_PASSWORD! }),
});

const classes = await client.repository.nodeContents({
  parent_type: 'DEVC/K',
  parent_name: 'ZMYPKG',
});
```

### MCP server (for AI assistants)

```bash
# stdio transport
npx @abapify/adt-mcp

# or HTTP transport
docker run --rm -p 3000:3000 ghcr.io/abapify/adt-mcp:latest
```

Every CLI command has a parity MCP tool — see the [MCP
docs](https://adt-cli.netlify.app/mcp/overview).

## Documentation

Full documentation lives at **[adt-cli.netlify.app](https://adt-cli.netlify.app)**:

- [Getting started](https://adt-cli.netlify.app/getting-started/installation) — install, authenticate, first commands
- [CLI reference](https://adt-cli.netlify.app/cli/overview) — every command and flag
- [SDK guide](https://adt-cli.netlify.app/sdk/packages/overview) — programmatic use from TypeScript
- [MCP server](https://adt-cli.netlify.app/mcp/overview) — expose ADT to AI assistants
- [Plugins](https://adt-cli.netlify.app/plugins/overview) — abapGit, gCTS, writing your own
- [Architecture](https://adt-cli.netlify.app/architecture/overview) — how the pieces fit together

Sources:

- Public docs — [`website/docs/`](./website/docs), rendered to the site above.
- Maintainer docs — [`docs/`](./docs), not rendered (design notes, planning, history).

## Packages

All packages are published to **[npmjs.org under `@abapify/*`](https://www.npmjs.com/search?q=%40abapify)**.
Every entry below links to the on-npm package; the first column links to
the source in this monorepo.

### CLI & plugins (user-facing)

| Package                                                   | npm                                                                                                                                     | Description                                              |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **[adt-cli](./packages/adt-cli)**                         | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-cli.svg)](https://www.npmjs.com/package/@abapify/adt-cli)                         | `adt` command-line interface                             |
| **[adt-mcp](./packages/adt-mcp)**                         | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-mcp.svg)](https://www.npmjs.com/package/@abapify/adt-mcp)                         | MCP server — exposes ADT tools to AI assistants          |
| **[adt-atc](./packages/adt-atc)**                         | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-atc.svg)](https://www.npmjs.com/package/@abapify/adt-atc)                         | ATC plugin — runs ABAP Test Cockpit, emits SARIF / GL CQ |
| **[adt-aunit](./packages/adt-aunit)**                     | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-aunit.svg)](https://www.npmjs.com/package/@abapify/adt-aunit)                     | ABAP Unit Test plugin, JUnit XML output for CI           |
| **[adt-diff](./packages/adt-diff)**                       | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-diff.svg)](https://www.npmjs.com/package/@abapify/adt-diff)                       | Diff plugin — compare local serialized files vs SAP      |
| **[adt-export](./packages/adt-export)**                   | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-export.svg)](https://www.npmjs.com/package/@abapify/adt-export)                   | Export plugin — deploy local sources to SAP              |
| **[adt-plugin-abapgit](./packages/adt-plugin-abapgit)**   | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-plugin-abapgit.svg)](https://www.npmjs.com/package/@abapify/adt-plugin-abapgit)   | abapGit serialization format plugin                      |
| **[adt-plugin-gcts](./packages/adt-plugin-gcts)**         | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-plugin-gcts.svg)](https://www.npmjs.com/package/@abapify/adt-plugin-gcts)         | gCTS (git-enabled CTS) plugin                            |
| **[adt-plugin-gcts-cli](./packages/adt-plugin-gcts-cli)** | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-plugin-gcts-cli.svg)](https://www.npmjs.com/package/@abapify/adt-plugin-gcts-cli) | `adt gcts` command wrapper over gCTS REST                |
| **[adt-tui](./packages/adt-tui)**                         | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-tui.svg)](https://www.npmjs.com/package/@abapify/adt-tui)                         | Ink-based terminal UI primitives                         |

### SDK & core libraries

| Package                                       | npm                                                                                                                         | Description                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **[adt-client](./packages/adt-client)**       | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-client.svg)](https://www.npmjs.com/package/@abapify/adt-client)       | Contract-driven HTTP client for ADT REST APIs                |
| **[adt-contracts](./packages/adt-contracts)** | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-contracts.svg)](https://www.npmjs.com/package/@abapify/adt-contracts) | Typed ADT REST API contract definitions                      |
| **[adt-schemas](./packages/adt-schemas)**     | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-schemas.svg)](https://www.npmjs.com/package/@abapify/adt-schemas)     | SAP ADT XML schemas generated from XSD                       |
| **[adk](./packages/adk)**                     | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadk.svg)](https://www.npmjs.com/package/@abapify/adk)                     | ABAP Development Kit — object construction and serialization |
| **[adt-auth](./packages/adt-auth)**           | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-auth.svg)](https://www.npmjs.com/package/@abapify/adt-auth)           | Auth: Basic, SLC, OAuth, browser SSO                         |
| **[adt-config](./packages/adt-config)**       | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-config.svg)](https://www.npmjs.com/package/@abapify/adt-config)       | Config loader for `adt.config.ts` / `.json`                  |
| **[adt-locks](./packages/adt-locks)**         | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-locks.svg)](https://www.npmjs.com/package/@abapify/adt-locks)         | Lock/unlock service for ADT objects                          |
| **[adt-plugin](./packages/adt-plugin)**       | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-plugin.svg)](https://www.npmjs.com/package/@abapify/adt-plugin)       | Plugin interface contract                                    |
| **[adt-rfc](./packages/adt-rfc)**             | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-rfc.svg)](https://www.npmjs.com/package/@abapify/adt-rfc)             | RFC transport over SOAP-over-HTTP (`/sap/bc/soap/rfc`)       |

### Authentication adapters

| Package                                         | npm                                                                                                                           | Description              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **[browser-auth](./packages/browser-auth)**     | [![npm](https://img.shields.io/npm/v/%40abapify%2Fbrowser-auth.svg)](https://www.npmjs.com/package/@abapify/browser-auth)     | Shared browser SSO logic |
| **[adt-playwright](./packages/adt-playwright)** | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-playwright.svg)](https://www.npmjs.com/package/@abapify/adt-playwright) | Playwright SSO adapter   |
| **[adt-puppeteer](./packages/adt-puppeteer)**   | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-puppeteer.svg)](https://www.npmjs.com/package/@abapify/adt-puppeteer)   | Puppeteer SSO adapter    |

### Foundation libraries

| Package                                         | npm                                                                                                                           | Description                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **[abap-ast](./packages/abap-ast)**             | [![npm](https://img.shields.io/npm/v/%40abapify%2Fabap-ast.svg)](https://www.npmjs.com/package/@abapify/abap-ast)             | Typed AST and pretty-printer for ABAP source code |
| **[acds](./packages/acds)**                     | [![npm](https://img.shields.io/npm/v/%40abapify%2Facds.svg)](https://www.npmjs.com/package/@abapify/acds)                     | ABAP CDS parser — tokenizer + AST                 |
| **[adt-codegen](./packages/adt-codegen)**       | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-codegen.svg)](https://www.npmjs.com/package/@abapify/adt-codegen)       | Hook-based code generation toolkit                |
| **[asjson-parser](./packages/asjson-parser)**   | [![npm](https://img.shields.io/npm/v/%40abapify%2Fasjson-parser.svg)](https://www.npmjs.com/package/@abapify/asjson-parser)   | ABAP asJSON canonical format parser               |
| **[logger](./packages/logger)**                 | [![npm](https://img.shields.io/npm/v/%40abapify%2Flogger.svg)](https://www.npmjs.com/package/@abapify/logger)                 | Shared logger interface                           |
| **[openai-codegen](./packages/openai-codegen)** | [![npm](https://img.shields.io/npm/v/%40abapify%2Fopenai-codegen.svg)](https://www.npmjs.com/package/@abapify/openai-codegen) | OpenAPI → ABAP client code generator              |
| **[speci](./packages/speci)**                   | [![npm](https://img.shields.io/npm/v/%40abapify%2Fspeci.svg)](https://www.npmjs.com/package/@abapify/speci)                   | Arrow-function REST contract specification        |
| **[ts-xsd](./packages/ts-xsd)**                 | [![npm](https://img.shields.io/npm/v/%40abapify%2Fts-xsd.svg)](https://www.npmjs.com/package/@abapify/ts-xsd)                 | XSD parser, builder, TypeScript type inference    |

## Architecture

```
adt-cli  (Commander.js CLI, plugin loader)
  │
  ├── adt-client  (HTTP client, auth interceptor)
  │     ├── adt-contracts  (speci endpoint definitions)
  │     └── adt-schemas    (XSD-derived TypeScript types)
  │
  ├── adk  (ABAP object construction: parse ADT XML → domain objects)
  │
  ├── adt-locks  (lock/unlock service shared with adk, adt-export)
  │
  ├── adt-auth  (session management: basic / SLC / OAuth / browser SSO)
  │     ├── adt-playwright  (Playwright browser adapter)
  │     └── adt-puppeteer   (Puppeteer browser adapter)
  │
  └── plugins  (opt-in command extensions)
        ├── adt-atc          (ATC runs → SARIF / GitLab Code Quality)
        ├── adt-aunit        (ABAP Unit → JUnit XML)
        ├── adt-diff         (local vs SAP diff)
        ├── adt-export       (file system → SAP deploy)
        ├── adt-plugin-abapgit  (abapGit format serialization)
        └── adt-plugin-gcts-cli (gCTS command wrapper)
```

**Type flow:** SAP XSD definitions → `ts-xsd` generates schema literals
→ `adt-schemas` exports them → `adt-contracts` wraps them in `speci`
endpoint descriptors → `adt-client` executes with full type inference
at the call site. This means the CLI, the SDK, and the MCP tools all
share the same type contract — fix a schema once, every caller picks it
up.

## Local development

Requirements: [Bun](https://bun.sh/) (not npm, pnpm, or yarn — the repo
uses bun workspaces and `workspace:*` protocol).

```bash
git clone https://github.com/abapify/adt-cli.git
cd adt-cli
bun install

# Common tasks (all nx-driven)
bunx nx build                 # build every package
bunx nx test                  # run every test
bunx nx typecheck             # type-check every package
bunx nx lint                  # lint + auto-fix
bunx nx run adt-cli:test      # single-package
```

### Repository layout

```
adt-cli/
├── packages/        # Every @abapify/* package lives here
├── samples/         # Example consumer projects
├── tools/           # Internal Nx plugins (nx-tsdown, nx-vitest, nx-npm-trust, …)
├── docs/            # Maintainer docs (not rendered on the site)
├── website/         # Docusaurus site (→ adt-cli.netlify.app)
├── openspec/        # Specs + proposals for in-flight changes
└── tmp/             # Scratch — gitignored
```

### Release workflow

The npm side uses **OIDC trusted publishing** — no `NPM_TOKEN` secret
lives anywhere. `tools/nx-npm-trust` is the internal plugin that
registered the trusted publishers (see its
[README](./tools/nx-npm-trust/README.md) for the setup / bootstrap
flow). To cut a release, maintainers trigger the `Release` workflow on
GitHub Actions; it computes the next version from conventional commits,
tags, pushes, and dispatches `publish.yml`, which in turn publishes all
30 packages through OIDC.

## Contributing

```bash
git checkout -b feat/my-change
# make changes
bunx nx affected -t build test typecheck lint
git push origin feat/my-change
# open a pull request against main
```

Conventions used by AI coding agents are documented in
[AGENTS.md](./AGENTS.md). Per-package AGENTS.md files extend those rules
with package-specific invariants.

## License

[MIT](./LICENSE)
