---
title: Mock ADT Server
sidebar_position: 5
---

# Mock ADT Server

`@abapify/adt-fixtures` ships a small in-process HTTP server that emulates
the SAP ADT surface for tests. It is the **only** mock server in the repo —
the MCP integration tests and the CLI e2e harness both consume it.

## Why

- Integration tests must exercise the full pipeline (CSRF → session → typed
  schema parsing) without requiring a live SAP system.
- Tests must run deterministically in CI, on laptops, and under sandboxed
  GitHub Actions.
- Fixtures ought to be **real SAP responses**, sanitised once, and reused
  everywhere so that MCP and CLI can't silently drift.

Before the unified mock, MCP had its own hand-rolled server and the CLI
e2e suite reimplemented the same routing. Consolidation landed together
with the `adt-fixtures` refactor.

## API

```ts
import { createMockAdtServer } from '@abapify/adt-fixtures';

const mock = createMockAdtServer({
  strictSession: true, // optional — enforce x-sap-security-session
});
const { port } = await mock.start();
// … use http://localhost:${port} as the adt baseUrl …
await mock.stop();
```

Returned object:

| Method              | Purpose                                                   |
| ------------------- | --------------------------------------------------------- |
| `start()`           | Binds to `127.0.0.1` on a random free port.               |
| `stop()`            | Closes the HTTP server; resolves after all sockets drain. |
| `locks` (property)  | Access to the `LockRegistry` for assertions in tests.     |
| `csrfToken` (prop.) | The token the mock will echo back in `x-csrf-token`.      |

`createMockAdtServer` is a thin wrapper over four composable modules
(`packages/adt-fixtures/src/mock-server/`):

```
server.ts         — HTTP wiring; ties everything together
routes.ts         — declarative route table + matcher
lock-registry.ts  — in-memory lock state (handles, owners, stale-detect)
csrf.ts           — CSRF session semantics (fetch / use / create / delete)
```

## Fixtures — lazy proxy over the registry

The fixture API is deliberately lazy:

```ts
import { fixtures } from '@abapify/adt-fixtures';

// No file IO yet:
const handle = fixtures.transport.single;
console.log(handle.path); // 'transport/single.xml'

// IO happens here:
const xml = await handle.load();
```

All fixtures are backed by a typed registry under
`packages/adt-fixtures/src/fixtures/` and declared in
`packages/adt-fixtures/src/fixtures.ts`. See
[`adt-fixtures` AGENTS.md](https://github.com/abapify/adt-cli/blob/main/packages/adt-fixtures/AGENTS.md)
for adding new fixtures.

## Route table

Routes are declared in `mock-server/routes.ts` with one entry per
`(method, path-pattern)` pair. Each entry returns a handler that
receives a `RouteContext` — the parsed URL, method, headers, body,
cookies, plus references to the lock registry and the CSRF state —
and returns a `{ status, headers, body }` descriptor.

For pre-canned XML responses the handler just loads a fixture:

```ts
{
  method: 'GET',
  pattern: /^\/sap\/bc\/adt\/cts\/transportrequests\/[^/]+$/,
  async handle() {
    return {
      status: 200,
      headers: { 'content-type': 'application/vnd.sap.adt.transportorganizer.v1+xml' },
      body: await fixtures.transport.single.load(),
    };
  },
}
```

For stateful routes (locks) the handler consults the lock registry.

## Lock emulation

`LockRegistry` mimics the SAP `/adtlock` surface:

- `POST  /…/adtlock` with `actionType=lock` → issues a handle, records the owner.
- `POST  /…/adtlock` with `actionType=unlock&lockHandle=X` → releases it.
- A conflicting lock request returns the same XML SAP returns
  (`ExceptionResourceNoAccess`, "currently editing"). This is what lets
  tests assert the **lock-conflict-does-not-clear-session** branch in
  the adt-client adapter.

The registry is cleared automatically per `createMockAdtServer()` call.
Tests can inspect it via `mock.locks.snapshot()`.

## CSRF session modelling

By default the mock follows the "pragmatic" mode: any `x-csrf-token:
Fetch` request gets a token; subsequent writes with that token are
accepted.

When you pass `strictSession: true`, the mock enforces the full SAP
3-step flow:

1. `GET /sap/bc/adt/core/http/sessions` with `x-sap-security-session:
create` — returns a session URL.
2. `GET /sap/bc/adt/core/http/sessions` with `use` + `x-csrf-token:
Fetch` — returns the token.
3. `DELETE /sap/bc/adt/core/http/sessions/<id>` with `use` — frees the
   slot; token survives.

Strict mode is used in the MCP session/CSRF regression tests to
reproduce the real Eclipse ADT protocol.

## Who uses it

| Consumer               | File                                                          |
| ---------------------- | ------------------------------------------------------------- |
| MCP integration tests  | `packages/adt-mcp/tests/integration.test.ts` (and neighbours) |
| CLI e2e tests (mock)   | `packages/adt-cli/tests/e2e/**` (via a shared `harness.ts`)   |
| adt-fixtures own tests | `packages/adt-fixtures/tests/**`                              |

The real-SAP flavour of the CLI e2e tests — a separate harness that
does **not** touch the mock — is documented on
[real-e2e](./real-e2e).

## Adding a new route

1. **Capture or synthesise** a fixture. Put it under
   `packages/adt-fixtures/src/fixtures/<area>/<name>.xml`.
2. **Register** in `packages/adt-fixtures/src/fixtures.ts` so it has a
   typed accessor (`fixtures.<area>.<name>`).
3. **Add a route entry** in
   `packages/adt-fixtures/src/mock-server/routes.ts`.
4. **Extend tests.** The MCP integration suite is usually the first
   consumer; CLI e2e picks it up naturally when a new CLI command hits
   the route.

## See also

- [Architecture → Real SAP e2e](./real-e2e)
- [SDK → adt-fixtures](../sdk/packages/adt-fixtures)
- [`adt-fixtures` AGENTS.md](https://github.com/abapify/adt-cli/blob/main/packages/adt-fixtures/AGENTS.md)
- [MCP server](../mcp/overview)
