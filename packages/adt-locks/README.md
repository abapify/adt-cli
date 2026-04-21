# @abapify/adt-locks

ADT lock/unlock operations and lock-store management. This is the single
lock implementation used across the `abapify/adt-cli` monorepo: it wraps the
SAP ADT lock/unlock REST endpoints, parses their XML responses, and persists
lock handles in a pluggable store so multi-object operations can release
locks reliably on failure.

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-locks.svg)](https://www.npmjs.com/package/@abapify/adt-locks)

## Install

```bash
npm i @abapify/adt-locks
# or
bun add @abapify/adt-locks
```

## Usage

Single lock / unlock via the service, backed by a file-based lock store:

```ts
import { createLockService, FileLockStore } from '@abapify/adt-locks';

const locks = createLockService(client, { store: new FileLockStore() });

const handle = await locks.lock('/sap/bc/adt/oo/classes/zcl_test');
try {
  // ... make changes via the ADT client ...
} finally {
  await locks.unlock('/sap/bc/adt/oo/classes/zcl_test', {
    lockHandle: handle.handle,
  });
}
```

Batch session for N objects with best-effort rollback on failure:

```ts
import { createBatchLockSession } from '@abapify/adt-locks';

const session = createBatchLockSession(locks, {
  targets: [
    { uri: '/sap/bc/adt/oo/classes/zcl_a' },
    { uri: '/sap/bc/adt/oo/classes/zcl_b' },
  ],
});

const acquired = await session.acquireAll();
// ... do work ...
await session.releaseAll();
```

## Role in the monorepo

- Single source of truth for ADT locks. `@abapify/adk` (save flow),
  `@abapify/adt-export`, and CLI commands all delegate to `LockService`
  rather than reimplementing lock/unlock.
- Depends only on `@abapify/adt-client` for transport; it does not know
  about specific object types, which keeps it reusable across plugins.
- Lock handles are bound to the client's security session; see the
  monorepo `AGENTS.md` for the 3-step CSRF / security-session protocol
  that must be in place before any call here will succeed.

## Related

- [abapify/adt-cli monorepo](https://github.com/abapify/adt-cli)
- [Full docs](https://adt-cli.netlify.app)

## License

MIT
