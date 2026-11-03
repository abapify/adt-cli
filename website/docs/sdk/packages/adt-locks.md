---
title: '@abapify/adt-locks'
description: Lock/unlock service, batch sessions, and lock stores.
---

# `@abapify/adt-locks`

Single implementation of the SAP ADT lock/unlock protocol. Exposes a service
API, a pluggable lock store (file-backed included), and a batch-lock session
that acquires/releases N locks atomically (best-effort rollback).

:::info
All lock/unlock operations in [`adk`](./adk), [`adt-export`](./adt-export),
and CLI commands delegate here. CSRF tokens come from the security session
managed by [`adt-client`](./adt-client).
:::

## Install

```bash
bun add @abapify/adt-locks
```

## Public API

```ts
// Types
export type { LockHandle, LockEntry } from '@abapify/adt-locks';

// Store
export type { LockStore } from '@abapify/adt-locks';
export { FileLockStore } from '@abapify/adt-locks';

// Service
export type {
  LockClient,
  LockService,
  LockOptions,
  UnlockOptions,
} from '@abapify/adt-locks';
export { createLockService, parseLockResponse } from '@abapify/adt-locks';

// Batch session
export {
  createBatchLockSession,
  type BatchLockSession,
} from '@abapify/adt-locks';
```

## Usage

```ts
import { createLockService, FileLockStore } from '@abapify/adt-locks';

const locks = createLockService(client, { store: new FileLockStore() });
const handle = await locks.lock('/sap/bc/adt/oo/classes/zcl_test');
try {
  // ... mutate the object
} finally {
  await locks.unlock('/sap/bc/adt/oo/classes/zcl_test', {
    lockHandle: handle.handle,
  });
}
```

## Dependencies

- `@abapify/adt-client`
- Consumed by: [`adk`](./adk), [`adt-cli`](./adt-cli), [`adt-export`](./adt-export).

## Recovery after a crash

SAP ADT requires the exact `lockHandle` returned by `LOCK` for `UNLOCK`.
`FileLockStore` persists that handle so a later process can release it:

```ts
await locks.forceUnlock('/sap/bc/adt/oo/classes/zcl_test');
```

Despite its historical name, `forceUnlock()` is **not** a server-side force
operation: it sends only `UNLOCK` with a persisted handle and never attempts a
second `LOCK`. If the handle was never persisted (for example, a server-side
CTS lock created by an interrupted object `POST`), SAP cannot disclose it by
URI. The caller must wait for expiry or ask the SAP administrator to clear it.
