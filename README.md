# abapify — ADT CLI Monorepo

[![CI](https://github.com/abapify/adt-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/abapify/adt-cli/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933)](https://nodejs.org/)

TypeScript monorepo providing a CLI and supporting libraries for [SAP ABAP Development Tools (ADT)](https://help.sap.com/docs/ABAP_PLATFORM_NEW/c238d694b825421f940829321ffa326a/4ec8641126391014adc9fffe4e204223.html) REST APIs.

## Packages

### CLI

| Package                           | npm                                                                                                         | Description                           |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **[adt-cli](./packages/adt-cli)** | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-cli)](https://www.npmjs.com/package/@abapify/adt-cli) | Command-line interface — `adt` binary |

### Core Libraries

| Package                                       | npm                                                                                                                     | Description                                                  |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **[adt-client](./packages/adt-client)**       | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-client)](https://www.npmjs.com/package/@abapify/adt-client)       | Contract-driven HTTP client for ADT REST APIs                |
| **[adt-contracts](./packages/adt-contracts)** | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-contracts)](https://www.npmjs.com/package/@abapify/adt-contracts) | Typed ADT REST API contract definitions                      |
| **[adt-schemas](./packages/adt-schemas)**     | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-schemas)](https://www.npmjs.com/package/@abapify/adt-schemas)     | SAP ADT XML schemas generated from XSD                       |
| **[adk](./packages/adk)**                     | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadk)](https://www.npmjs.com/package/@abapify/adk)                     | ABAP Development Kit — object construction and serialization |
| **[adt-auth](./packages/adt-auth)**           | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-auth)](https://www.npmjs.com/package/@abapify/adt-auth)           | Authentication: Basic, SLC, OAuth, browser SSO               |
| **[adt-config](./packages/adt-config)**       | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-config)](https://www.npmjs.com/package/@abapify/adt-config)       | Config loader for `adt.config.ts` / `.json`                  |

### CLI Plugins

| Package                                                 | npm                                                                                                                               | Description                                                       |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **[adt-atc](./packages/adt-atc)**                       | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-atc)](https://www.npmjs.com/package/@abapify/adt-atc)                       | ABAP Test Cockpit — runs ATC, outputs SARIF / GitLab Code Quality |
| **[adt-export](./packages/adt-export)**                 | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-export)](https://www.npmjs.com/package/@abapify/adt-export)                 | Export plugin — deploy local files to SAP                         |
| **[adt-plugin](./packages/adt-plugin)**                 | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-plugin)](https://www.npmjs.com/package/@abapify/adt-plugin)                 | Plugin interface contract                                         |
| **[adt-plugin-abapgit](./packages/adt-plugin-abapgit)** | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-plugin-abapgit)](https://www.npmjs.com/package/@abapify/adt-plugin-abapgit) | abapGit serialization format plugin                               |

### Authentication Adapters

| Package                                         | npm                                                                                                                       | Description                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **[browser-auth](./packages/browser-auth)**     | [![npm](https://img.shields.io/npm/v/%40abapify%2Fbrowser-auth)](https://www.npmjs.com/package/@abapify/browser-auth)     | Shared browser SSO logic             |
| **[adt-playwright](./packages/adt-playwright)** | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-playwright)](https://www.npmjs.com/package/@abapify/adt-playwright) | Playwright SSO authentication plugin |
| **[adt-puppeteer](./packages/adt-puppeteer)**   | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-puppeteer)](https://www.npmjs.com/package/@abapify/adt-puppeteer)   | Puppeteer SSO authentication plugin  |

### Foundation Libraries

| Package                                       | npm                                                                                                                     | Description                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **[speci](./packages/speci)**                 | [![npm](https://img.shields.io/npm/v/speci)](https://www.npmjs.com/package/speci)                                       | Arrow-function REST contract specification         |
| **[ts-xsd](./packages/ts-xsd)**               | [![npm](https://img.shields.io/npm/v/ts-xsd)](https://www.npmjs.com/package/ts-xsd)                                     | XSD parser, builder, and TypeScript type inference |
| **[adt-codegen](./packages/adt-codegen)**     | [![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-codegen)](https://www.npmjs.com/package/@abapify/adt-codegen)     | Hook-based code generation toolkit                 |
| **[asjson-parser](./packages/asjson-parser)** | [![npm](https://img.shields.io/npm/v/%40abapify%2Fasjson-parser)](https://www.npmjs.com/package/@abapify/asjson-parser) | ABAP asJSON canonical format parser                |
| **[logger](./packages/logger)**               | [![npm](https://img.shields.io/npm/v/%40abapify%2Flogger)](https://www.npmjs.com/package/@abapify/logger)               | Shared logger interface                            |

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

**Requirements:** Node.js 18+, npm (not pnpm or yarn)

```bash
git clone https://github.com/abapify/adt-cli.git
cd adt-cli

npm install

# Build all packages
npx nx build

# Run all tests
npx nx test

# Type check
npx nx typecheck
```

### Common Commands

```bash
# Build a specific package
npx nx build adt-cli

# Test a specific package
npx nx test adt-cli

# Lint everything
npx nx lint

# Watch mode for a package
npx nx test adt-cli --watch
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
npx nx build adt-cli && npx nx test adt-cli
git push origin feat/my-change
# open pull request
```

See [AGENTS.md](./AGENTS.md) for conventions used by AI coding agents.

## License

[MIT](./LICENSE)
