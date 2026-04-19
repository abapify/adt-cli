---
title: '@abapify/adk'
description: ABAP Development Kit — object model and save/lock orchestration.
---

# `@abapify/adk`

Facade over [`@abapify/adt-client`](./adt-client) that exposes stable,
object-oriented ABAP interfaces (`AdkClass`, `AdkInterface`, `AdkPackage`,
`AdkFunctionGroup`, `AdkFunctionModule`, …). Handles the save/lock/ETag
orchestration documented in the package `AGENTS.md` and delegates locking to
[`@abapify/adt-locks`](./adt-locks).

## Install

```bash
bun add @abapify/adk
```

## Public API

```ts
// Base
export type { AbapObject } from '@abapify/adk';
export type { AdkContext } from '@abapify/adk';
export type { LockRegistry, LockEntry } from '@abapify/adk';
export { AdkObject, AdkMainObject,
         type LockHandle, type SaveOptions,
         type ActivationResult, type AtomLink,
         type AdtObjectReference,
         type AdkObjectData, type AdkMainObjectData } from '@abapify/adk';

// Bulk operations
export { AdkObjectSet,
         type BulkSaveResult, type BulkSaveOptions,
         type BulkActivateOptions } from '@abapify/adk';

// Lock integration
export { createLockService, type LockStore, type LockService } from '@abapify/adk';

// Factory
export { createAdk, initializeAdk } from '@abapify/adk';

// Concrete object types (non-exhaustive — see src/index.ts)
// AdkClass, AdkInterface, AdkPackage, AdkFunctionGroup, AdkFunctionModule, …
```

> See [`packages/adk/src/index.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adk/src/index.ts) for the authoritative list.

## Usage

```ts
import { createAdtClient } from '@abapify/adt-client';
import { createAdk } from '@abapify/adk';

const client = createAdtClient({ baseUrl, username, password, client: '100' });
const adk = createAdk(client);

const pkg = await adk.getPackage('ZABAPGIT_EXAMPLES');
const klass = await adk.getClass('ZCL_DEMO');
await klass.save({ transport: 'DEVK900001' });
```

## Dependencies

- `@abapify/adt-client`, `@abapify/adt-locks`, `@abapify/adt-schemas`
- Consumed by: [`adt-cli`](./adt-cli), [`adt-export`](./adt-export),
  [`adt-diff`](./adt-diff), [`adt-plugin-abapgit`](./adt-plugin-abapgit).

## See also

- Package internals: [`packages/adk/AGENTS.md`](https://github.com/abapify/adt-cli/blob/main/packages/adk/AGENTS.md)
- [`adt-locks`](./adt-locks) — lock service delegated to from `AdkObject`
