---
title: '@abapify/adt-fixtures'
description: Real SAP XML fixtures and the mock ADT HTTP server.
---

# `@abapify/adt-fixtures`

Centralised registry of **real** SAP ADT XML responses for reuse across tests
and scripts, plus the in-process mock ADT HTTP server used by the MCP and
e2e suites. Fixtures load lazily.

:::caution Private package
`@abapify/adt-fixtures` is marked `private: true` — it ships with the monorepo
and is not published to the registry.
:::

## Install

Workspace dependency only:

```json
{ "devDependencies": { "@abapify/adt-fixtures": "workspace:*" } }
```

## Public API

```ts
export { load, getPath, getFixturesRoot } from '@abapify/adt-fixtures';
export { fixtures } from '@abapify/adt-fixtures';
export type { FixtureHandle, Fixtures } from '@abapify/adt-fixtures';

// Mock ADT HTTP server
export {
  createMockAdtServer,
  LockRegistry,
  matchRoute,
  loadRouteFixtures,
} from '@abapify/adt-fixtures';
export type {
  MockAdtServer,
  MockAdtServerOptions,
  LockEntry,
  RouteResult,
  LoadedFixtures,
} from '@abapify/adt-fixtures';
```

## Usage

```ts
import { fixtures, createMockAdtServer } from '@abapify/adt-fixtures';

// Lazy fixture load
const xml = await fixtures.transport.single.load();

// Spin up the mock server (integration tests)
const server = await createMockAdtServer();
try {
  // ... point your client at server.baseUrl
} finally {
  await server.close();
}
```

## Dependencies

- Consumed by [`adt-schemas`](./adt-schemas) tests,
  [`adt-contracts`](./adt-contracts) contract tests,
  [`adt-mcp`](./adt-mcp) integration tests, and CLI e2e suites.

## See also

- Package internals: [`packages/adt-fixtures/AGENTS.md`](https://github.com/abapify/adt-cli/blob/main/packages/adt-fixtures/AGENTS.md)
