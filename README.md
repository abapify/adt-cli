# abapify — ADT CLI Monorepo

[![CI](https://github.com/abapify/adt-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/abapify/adt-cli/actions/workflows/ci.yml)
[![Pipeline Status](https://github.com/abapify/adt-cli/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/abapify/adt-cli/actions/workflows/ci.yml)

TypeScript monorepo providing a CLI and supporting libraries for [SAP ABAP Development Tools (ADT)](https://help.sap.com/docs/ABAP_PLATFORM_NEW/c238d694b825421f940829321ffa326a/4ec8641126391014adc9fffe4e204223.html) REST APIs.

## Packages

### CLI

| Package                           | version                                                                                                                                                                             | Description                           |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **[adt-cli](./packages/adt-cli)** | [![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/adt-cli/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fadt-cli) | Command-line interface — `adt` binary |

### Core Libraries

| Package                                       | version                                                                                                                                                                                         | Description                                                  |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **[adt-client](./packages/adt-client)**       | [![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/adt-client/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fadt-client)       | Contract-driven HTTP client for ADT REST APIs                |
| **[adt-contracts](./packages/adt-contracts)** | [![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/adt-contracts/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fadt-contracts) | Typed ADT REST API contract definitions                      |
| **[adt-schemas](./packages/adt-schemas)**     | [![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/adt-schemas/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fadt-schemas)     | SAP ADT XML schemas generated from XSD                       |
| **[adk](./packages/adk)**                     | [![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/adk/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fadk)                     | ABAP Development Kit — object construction and serialization |
| **[adt-auth](./packages/adt-auth)**           | [![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/adt-auth/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fadt-auth)           | Authentication: Basic, SLC, OAuth, browser SSO               |
| **[adt-config](./packages/adt-config)**       | [![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/adt-config/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fadt-config)       | Config loader for `adt.config.ts` / `.json`                  |

### CLI Plugins

| Package                                                 | version                                                                                                                                                                                                   | Description                                                       |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **[adt-atc](./packages/adt-atc)**                       | [![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/adt-atc/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fadt-atc)                       | ABAP Test Cockpit — runs ATC, outputs SARIF / GitLab Code Quality |
| **[adt-export](./packages/adt-export)**                 | [![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/adt-export/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fadt-export)                 | Export plugin — deploy local files to SAP                         |
| **[adt-plugin](./packages/adt-plugin)**                 | [![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/adt-plugin/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fadt-plugin)                 | Plugin interface contract                                         |
| **[adt-plugin-abapgit](./packages/adt-plugin-abapgit)** | [![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/adt-plugin-abapgit/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fadt-plugin-abapgit) | abapGit serialization format plugin                               |

### Authentication Adapters

| Package                                         | version                                                                                                                                                                                           | Description                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **[browser-auth](./packages/browser-auth)**     | [![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/browser-auth/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fbrowser-auth)     | Shared browser SSO logic             |
| **[adt-playwright](./packages/adt-playwright)** | [![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/adt-playwright/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fadt-playwright) | Playwright SSO authentication plugin |
| **[adt-puppeteer](./packages/adt-puppeteer)**   | [![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/adt-puppeteer/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fadt-puppeteer)   | Puppeteer SSO authentication plugin  |

### Foundation Libraries

| Package                                       | version                                                                                                                                                                                         | Description                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **[speci](./packages/speci)**                 | [![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/speci/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fspeci)                 | Arrow-function REST contract specification         |
| **[ts-xsd](./packages/ts-xsd)**               | [![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/ts-xsd/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fts-xsd)               | XSD parser, builder, and TypeScript type inference |
| **[adt-codegen](./packages/adt-codegen)**     | [![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/adt-codegen/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fadt-codegen)     | Hook-based code generation toolkit                 |
| **[asjson-parser](./packages/asjson-parser)** | [![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/asjson-parser/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fasjson-parser) | ABAP asJSON canonical format parser                |
| **[logger](./packages/logger)**               | [![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/logger/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Flogger)               | Shared logger interface                            |

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
  ├── adt-auth  (session management: basic / SLC / OAuth / browser SSO)
  │     ├── adt-playwright  (Playwright browser adapter)
  │     └── adt-puppeteer   (Puppeteer browser adapter)
  │
  └── plugins  (opt-in command extensions)
        ├── adt-atc          (ATC runs → SARIF / GitLab Code Quality)
        ├── adt-export       (file system → SAP deploy)
        └── adt-plugin-abapgit  (abapGit format serialization)
```

**Type flow:** SAP XSD definitions → `ts-xsd` generates schema literals → `adt-schemas` exports them → `adt-contracts` wraps them in `speci` endpoint descriptors → `adt-client` executes with full type inference.

## Development Setup

**Requirements:** [Bun](https://bun.sh/) (not npm, pnpm or yarn)

```bash
git clone https://github.com/abapify/adt-cli.git
cd adt-cli

bun install

# Build all packages
bunx nx build

# Run all tests
bunx nx test

# Type check
bunx nx typecheck
```

### Common Commands

```bash
# Build a specific package
bunx nx build adt-cli

# Test a specific package
bunx nx test adt-cli

# Lint everything
bunx nx lint

# Watch mode for a package
bunx nx test adt-cli --watch
```

## Repository Structure

```
adt-cli/
├── packages/
│   ├── adt-cli/            # Main CLI binary
│   ├── adt-client/         # HTTP client
│   ├── adt-contracts/      # REST API contracts
│   ├── adt-schemas/        # SAP ADT XSD schemas
│   ├── adk/                # ABAP object modeling
│   ├── adt-auth/           # Authentication
│   ├── adt-config/         # Config loader
│   ├── adt-atc/            # ATC plugin
│   ├── adt-export/         # Export plugin
│   ├── adt-plugin/         # Plugin interface
│   ├── adt-plugin-abapgit/ # abapGit plugin
│   ├── browser-auth/       # Browser SSO core
│   ├── adt-playwright/     # Playwright adapter
│   ├── adt-puppeteer/      # Puppeteer adapter
│   ├── speci/              # Contract spec
│   ├── ts-xsd/             # XSD tools
│   ├── adt-codegen/        # Code generation
│   ├── asjson-parser/      # asJSON parser
│   └── logger/             # Shared logger
├── docs/                   # Architecture docs and specs
├── samples/                # Example projects
└── tmp/                    # Local temp files (gitignored)
```

## Code Standards

- TypeScript strict mode throughout
- ESM modules (`"type": "module"` in all packages)
- Async/await over callbacks
- Native Node.js APIs preferred over external dependencies
- `tsdown` for building (outputs `.mjs` + `.d.mts`)
- Vitest for testing

## Contributing

```bash
git checkout -b feat/my-change
# make changes
bunx nx build adt-cli && bunx nx test adt-cli
git push origin feat/my-change
# open pull request
```

See [AGENTS.md](./AGENTS.md) for conventions used by AI coding agents.

## License

[MIT](./LICENSE)
