# @abapify/adt-locks

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-locks)](https://www.npmjs.com/package/@abapify/adt-locks)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

ADT lock/unlock operations and lock store management.

## Install

```bash
npm install @abapify/adt-locks
```

## Usage

```ts
import { createLockService, FileLockStore } from '@abapify/adt-locks';

const locks = createLockService(client, { store: new FileLockStore() });
const handle = await locks.lock('/sap/bc/adt/oo/classes/zcl_test');
try {
  // ... write via the ADT client ...
} finally {
  await locks.unlock('/sap/bc/adt/oo/classes/zcl_test', {
    lockHandle: handle.handle,
  });
}
```

## Features

- Lock / unlock ADT objects with persisted lock handles
- Crash recovery: release stale locks from the lock store

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-locks](https://adt-cli.netlify.app/sdk/packages/adt-locks)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
