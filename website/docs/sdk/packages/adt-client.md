---
title: '@abapify/adt-client'
description: Typed REST client generated from adt-contracts.
---

# `@abapify/adt-client`

Thin adapter over [`@abapify/speci`](./speci) that turns the
[`@abapify/adt-contracts`](./adt-contracts) tree into a fully-typed client.
Handles the SAP security-session / CSRF protocol and content-negotiated
XML/JSON parsing using [`@abapify/adt-schemas`](./adt-schemas).

:::info Session protocol
Locks are bound to the security session. `adt-client` implements the 3-step
Eclipse flow (create → fetch CSRF → delete) documented in the package
`AGENTS.md`. Do not bypass it.
:::

## Install

```bash
bun add @abapify/adt-client
```

## Public API

```ts
export { createAdtClient, type AdtClient } from '@abapify/adt-client';
export { adtContract, type AdtContract } from '@abapify/adt-client';
export type {
  AdtConnectionConfig,
  OperationResult,
  LockHandle,
  AdtError,
  Logger,
} from '@abapify/adt-client';

// Adapter (advanced)
export {
  createAdtAdapter,
  type HttpAdapter,
  type AdtAdapterConfig,
} from '@abapify/adt-client';

// Response plugins
export {
  type ResponsePlugin,
  type ResponseContext,
  type LogFunction,
  type FileLoggingConfig,
  LoggingPlugin,
  FileLoggingPlugin,
} from '@abapify/adt-client';
```

## Usage

```ts
import { createAdtClient } from '@abapify/adt-client';

const client = createAdtClient({
  baseUrl: 'https://sap.example.com',
  username: 'USER',
  password: 'pass',
  client: '100',
});

// Two-layer API:
const info = await client.adt.core.http.systeminformation.get();
const search = await client.adt.repository.informationsystem.search.quickSearch(
  {
    query: 'ZCL_',
    maxResults: 50,
  },
);
```

## Dependencies

- `@abapify/adt-contracts`, `@abapify/adt-schemas`, `@abapify/logger`
- Consumed by virtually every other package.

## See also

- Package internals: [`packages/adt-client/AGENTS.md`](https://github.com/abapify/adt-cli/blob/main/packages/adt-client/AGENTS.md)
- [Contracts catalog](../contracts/overview)
- [`speci`](./speci), [`adt-contracts`](./adt-contracts)
