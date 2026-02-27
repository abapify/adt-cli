# Abapify.js Monorepo

**ADT Toolkit** - TypeScript libraries for SAP ABAP Development Tools (ADT) REST APIs.

## 🎯 Vision

A complete ADT toolkit providing:

- **CLI** - Command-line interface for SAP ADT operations
- **Client** - Type-safe HTTP client library for ADT REST APIs
- **MCP** - Model Context Protocol server for AI integration (future)

## ⚠️ Current Status: Proof of Concept

This project is in **PoC phase**, focusing on technical implementation and architecture validation. The goal is to establish a solid foundation with:

- **Contract-first API design** using `speci` + `ts-xsd`
- **Type-safe XML handling** with automatic schema generation
- **Clean separation** between contracts, client, and CLI layers

**AI-Driven Development**: This project is actively developed using AI assistants. APIs may change, and some features are experimental.

## 🏗️ Target Architecture

The architecture prioritizes **type safety** and **contract-first design**:

```
┌─────────────────────────────────────────────────────────────────┐
│                         ADT CLI                                  │
│                    (User Interface Layer)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      adt-client-v2                               │
│              (HTTP Client + Request Execution)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      adt-contracts                               │
│         (REST API Contracts using speci + ts-xsd)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     adt-schemas-xsd                              │
│        (TypeScript schemas from SAP XSD definitions)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────┬──────────────────────────────────┐
│           ts-xsd             │             speci                 │
│   (XSD → TypeScript types)   │    (Contract specification)       │
└──────────────────────────────┴──────────────────────────────────┘
```

### Why This Architecture?

**Contract-First Design** solves the fundamental problem of SAP ADT integration:

1. **SAP provides XSD schemas** - Official XML schema definitions for ADT APIs
2. **ts-xsd generates TypeScript** - Automatic type generation from XSD
3. **speci defines contracts** - Type-safe REST endpoint definitions
4. **adt-contracts combines them** - Declarative API contracts with full type inference
5. **adt-client-v2 executes** - HTTP client that understands contracts
6. **adt-cli exposes** - User-friendly command-line interface

**Benefits:**

- ✅ **Single source of truth** - XSD schemas define types once
- ✅ **Full type safety** - TypeScript types flow from schema to CLI
- ✅ **No manual type definitions** - Generated from official SAP schemas
- ✅ **Easy to extend** - Add new endpoints by defining contracts
- ✅ **Testable** - Contracts are pure data, easy to mock

## 📦 Package Overview

### Core Packages (Target Design)

| Package                                           | Purpose                              | Status         |
| ------------------------------------------------- | ------------------------------------ | -------------- |
| **[ts-xsd](./packages/ts-xsd)**                   | XSD → TypeScript schema generation   | ✅ Active      |
| **[speci](./packages/speci)**                     | Contract specification system        | ✅ Active      |
| **[adt-schemas-xsd](./packages/adt-schemas-xsd)** | SAP ADT schemas (generated from XSD) | ✅ Active      |
| **[adt-contracts](./packages/adt-contracts)**     | REST API contracts (speci + ts-xsd)  | 🚧 Development |
| **[adt-client-v2](./packages/adt-client-v2)**     | HTTP client using contracts          | 🚧 Development |
| **[adt-cli](./packages/adt-cli)**                 | Command-line interface               | ✅ Active      |

### Supporting Packages

| Package                                       | Purpose                                | Status         |
| --------------------------------------------- | -------------------------------------- | -------------- |
| **[adt-auth](./packages/adt-auth)**           | Authentication (Basic, SLC, OAuth)     | ✅ Active      |
| **[adt-config](./packages/adt-config)**       | Configuration loader                   | ✅ Active      |
| **[browser-auth](./packages/browser-auth)**   | Browser-based SSO                      | ✅ Active      |
| **[adt-puppeteer](./packages/adt-puppeteer)** | Puppeteer SSO adapter                  | ✅ Active      |
| **[adk](./packages/adk)**                     | ABAP Development Kit - object modeling | 🚧 Development |

### Legacy Packages (Subject to Deletion)

| Package                                 | Replacement   | Notes                                    |
| --------------------------------------- | ------------- | ---------------------------------------- |
| **[adt-client](./packages/adt-client)** | adt-client-v2 | Original client without contract support |
| **[ts-xml](./packages/ts-xml)**         | ts-xsd        | Earlier XML schema approach              |

> ⚠️ **Legacy packages** will be removed once migration to the new architecture is complete.

## 🛠️ Development Setup

### Prerequisites

- **Node.js 18+**
- **npm** (not pnpm or yarn - important!)
- **Git**

### Project Setup

```bash
# Clone the repository
git clone https://github.com/your-org/abapify-js.git
cd abapify-js

# Install dependencies
npm install

# Build all packages
npx nx build

# Run tests
npx nx test

# Type checking
npx nx typecheck
```

## 📁 Repository Structure

```
abapify-js/
├── packages/
│   ├── ts-xsd/           # XSD → TypeScript (foundation)
│   ├── speci/            # Contract specification (foundation)
│   ├── adt-schemas-xsd/  # SAP ADT schemas (generated)
│   ├── adt-contracts/    # REST API contracts
│   ├── adt-client-v2/    # HTTP client (new)
│   ├── adt-cli/          # Command-line interface
│   ├── adt-auth/         # Authentication
│   ├── adt-config/       # Configuration
│   ├── adk/              # ABAP object modeling
│   ├── adt-client/       # ⚠️ Legacy - to be removed
│   └── ts-xml/           # ⚠️ Legacy - to be removed
├── docs/                 # Documentation
├── e2e/                  # End-to-end tests
└── tmp/                  # Temporary files (gitignored)
```

## 🔧 NX Monorepo Commands

```bash
# Build specific package
npx nx build adt-cli
npx nx build adt-client

# Run tests for specific package
npx nx test adk
npx nx test adt-cli

# Build all packages
npx nx run-many --target=build

# Run all tests
npx nx run-many --target=test

# Lint all packages
npx nx run-many --target=lint
```

### NX Plugins Used

- **@nx/node** - Node.js library support
- **@nx/eslint** - ESLint integration
- **@nx/vite** - Vite build tool integration

## 📋 Code Guidelines

### TypeScript Standards

- **Strict Mode**: All packages use TypeScript strict mode
- **ESNext**: Prefer native Node.js APIs over external dependencies
- **Async/Await**: Use async patterns over callbacks or sync operations

### Code Style

```typescript
// ✅ Good - PascalCase for types, camelCase for variables
interface AdtClientConfig {
  serviceKeyPath: string;
}

const createClient = async (config: AdtClientConfig) => {
  // Implementation
};

// ✅ Good - Use native APIs
const response = await fetch(url, options);
const fileContent = await readFile(path, 'utf-8');
```

### Architecture Principles

1. **CLI-First**: Design for command-line usage and automation
2. **Modular**: Small, focused packages with clear boundaries
3. **Type-Safe**: Comprehensive TypeScript support
4. **Testable**: High test coverage with Vitest

### Import Guidelines

```typescript
// ✅ Cross-package imports
import { AdtClientImpl } from '@abapify/adt-client';

// ✅ Internal imports (extensionless for bundlers)
import { parseXml } from '../utils/xml-parser';

// ✅ External packages
import { Command } from 'commander';
```

## 🤝 Contributing

### Quick Start for Contributors

1. **Fork and Clone**

   ```bash
   git clone https://github.com/your-username/abapify-js.git
   cd abapify-js
   npm install
   ```

2. **Create Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Write tests first (TDD approach)
   - Implement your changes
   - Ensure all tests pass: `npx nx test`

4. **Submit PR**
   - Push branch: `git push origin feature/your-feature-name`
   - Open PR with clear description

### Development Workflow

```bash
# Install dependencies
npm install

# Build and test everything
npx nx build && npx nx test

# Work on specific package
npx nx build adt-cli
npx nx test adt-cli --watch

# Create new package
npx nx g @nx/node:library packages/my-package
```

### Project Planning

- **Current Work**: See [current-sprint.md](./docs/planning/current-sprint.md)
- **Project Status**: See [abap-code-review.md](./docs/planning/abap-code-review.md)
- **Roadmap**: See [roadmap.md](./docs/planning/roadmap.md)

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🔑 Key Concepts

### ts-xsd + speci: The Contract Foundation

The combination of `ts-xsd` and `speci` provides a powerful contract specification system:

**ts-xsd** converts XSD schemas to TypeScript:

```typescript
// Generated from SAP's official XSD
const TransportSchema = {
  ns: 'http://www.sap.com/adt/cts',
  root: 'request',
  elements: {
    request: {
      sequence: [
        { name: 'requestHeader', type: 'requestHeader' },
        { name: 'tasks', type: 'tasks' },
      ],
    },
    // ... full type definitions
  },
} as const;

// TypeScript type is automatically inferred!
type Transport = InferXsd<typeof TransportSchema>;
```

**speci** defines REST contracts:

```typescript
import { http } from 'speci/rest';
import { schemas } from 'adt-schemas-xsd';

const ctsContract = {
  getTransport: (id: string) =>
    http.get(`/sap/bc/adt/cts/transportrequests/${id}`, {
      responses: { 200: schemas.transportmanagment },
    }),
};
```

**Result**: Full type safety from XSD to API response, with zero manual type definitions.

### Why Not Just Use fast-xml-parser?

Traditional XML parsers force you into their data format:

```typescript
// fast-xml-parser output - awkward structure
const data = {
  "cts:request": {
    "@_xmlns:cts": "http://www.sap.com/adt/cts",
    "cts:requestHeader": { ... }
  }
};
```

With ts-xsd, you get clean domain objects:

```typescript
// ts-xsd output - clean TypeScript types
const data: Transport = {
  requestHeader: { trRequestId: 'DEVK900001', ... },
  tasks: [...]
};
```

## 🗺️ Roadmap

- **Current (PoC)**: Contract-first architecture with ts-xsd + speci
- **Next**: Complete adt-contracts coverage for core ADT APIs
- **Future**: MCP server for AI-assisted ABAP development

---

**Built for the SAP development community** 🚀
