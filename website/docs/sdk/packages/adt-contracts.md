---
title: '@abapify/adt-contracts'
description: speci-based ADT REST API contract descriptors.
---

# `@abapify/adt-contracts`

Type-safe descriptors for the full SAP ADT REST surface (plus gCTS and FLP).
Contracts wrap [`@abapify/adt-schemas`](./adt-schemas) with
[`@abapify/speci`](./speci) HTTP verbs. The consuming
[`adt-client`](./adt-client) turns the `adtContract` tree into a callable
client.

See the [Contracts catalog](../contracts/overview) for the per-namespace
reference.

## Install

```bash
bun add @abapify/adt-contracts
```

## Public API

```ts
// Base utilities (client creation, types)
export * from '@abapify/adt-contracts/base';

// Every ADT namespace (cts, atc, oo, ddic, …) and the aggregated tree
export * from '@abapify/adt-contracts';

// Notable exports:
export {
  adtContract,
  type AdtContract,
  type AdtClientType,
} from '@abapify/adt-contracts';
```

## Usage

```ts
import { adtContract, type AdtContract } from '@abapify/adt-contracts';

// Descriptors are plain objects — inspect a contract:
const transportGet = adtContract.cts.transportrequests.get('DEVK900001');
console.log(transportGet.method, transportGet.path);
```

Contracts are normally invoked through [`adt-client`](./adt-client).

## Dependencies

- `@abapify/speci`, `@abapify/adt-schemas`
- Consumed by [`adt-client`](./adt-client), [`adk`](./adk),
  [`adt-cli`](./adt-cli) services, [`adt-mcp`](./adt-mcp).

## What is it?

This package is the **contract layer** between `adt-client` and `adt-schemas`. It provides declarative REST API contracts for SAP ADT (ABAP Development Tools) endpoints.

```
┌─────────────────────────────────────────────────────────────────┐
│                      adt-client                               │
│              (HTTP Client + Request Execution)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      adt-contracts (this package)                │
│         (REST API Contracts using speci + ts-xsd)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     adt-schemas                              │
│        (TypeScript schemas from SAP XSD definitions)             │
└─────────────────────────────────────────────────────────────────┘
```

Contracts are pure data structures that define:

- **Endpoint URLs** - REST paths
- **HTTP methods** - GET, POST, PUT, DELETE
- **Request/Response schemas** - Using `ts-xsd` generated from SAP XSD definitions
- **Content-Types** - SAP vendor-specific media types

## Available Contracts

| Contract       | Description                           |
| -------------- | ------------------------------------- |
| `coreContract` | Core ADT object operations            |
| `ctsContract`  | Change and Transport System           |
| `atcContract`  | ABAP Test Cockpit                     |
| `ooContract`   | Object-Oriented (classes, interfaces) |

## Architecture

```
adt-contracts (this package)
    ├── speci contracts (endpoint definitions)
    └── adt-schemas (ts-xsd schemas)
            └── ts-xsd (XSD → TypeScript)
```

**Contracts are pure data** - no HTTP client, no business logic. Use with any `speci`-compatible adapter.

## Adding New Contracts

1. Ensure schema exists in `adt-schemas`
2. Create contract file in `src/adt/<feature>/index.ts`
3. Define endpoints using `adtHttp.get/post/put/delete`
4. Export from `src/adt/index.ts`

```typescript
import { adtHttp } from '../../base';
import { mySchema } from 'adt-schemas';

export const myContract = {
  getResource: (id: string) =>
    adtHttp.get(`/my/endpoint/${id}`, {
      responses: { 200: mySchema },
      headers: { Accept: 'application/vnd.sap.adt.my.v1+xml' },
    }),
};
```

## See also

- Package internals: [`packages/adt-contracts/AGENTS.md`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/AGENTS.md)
- [Contract namespaces](../contracts/overview)
