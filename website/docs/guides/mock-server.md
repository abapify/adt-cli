---
title: Mock server for local dev & CI
sidebar_position: 13
description: Run tests and CLI flows without a live SAP — use the @abapify/adt-fixtures mock.
---

# Mock server for local development & CI

## Goal

Run adt-cli commands, plugin tests, and integration suites **without a live
SAP system**. `@abapify/adt-fixtures` ships a minimal in-process HTTP server
that speaks the ADT protocol (security sessions, CSRF, locks, ETags) and
serves real captured XML fixtures for the most common endpoints.

## When to use it

| Use case                                     | Fit                  |
| -------------------------------------------- | -------------------- |
| Unit/integration tests for plugins           | ✅                   |
| CI smoke tests that don't need real data     | ✅                   |
| Local offline development (trains, planes)   | ✅                   |
| AI-agent tool development (MCP)              | ✅                   |
| End-to-end regression against prod-like data | ❌ — use real system |

## Prerequisites

- Node.js ≥ 20
- `@abapify/adt-fixtures` available — already a workspace dep in this repo,
  or install with `npm i -D @abapify/adt-fixtures` in external projects.

## Starting the server

```typescript
// tests/mock.test.ts
import { createMockAdtServer } from '@abapify/adt-fixtures';

const mock = createMockAdtServer();
const { port } = await mock.start();
const baseUrl = `http://localhost:${port}`;

// ... run tests against baseUrl ...

await mock.stop();
```

The server:

- Binds to a random free port (`0`) — safe to parallelise.
- Generates a fresh CSRF token per instance.
- Tracks locks in-memory via `LockRegistry`.
- Returns real (sanitised) SAP XML / JSON from the fixtures catalog.

## Pointing adt-cli at it

```bash
cat > ~/.adt/auth.json <<JSON
{
  "default": "MOCK",
  "sessions": {
    "MOCK": {
      "sid": "MOCK",
      "host": "http://localhost:$PORT",
      "client": "100",
      "auth": {
        "method": "basic",
        "plugin": "@abapify/adt-auth",
        "credentials": { "username": "TESTUSER", "password": "MOCK" }
      }
    }
  }
}
JSON

adt info
adt cts tr list
adt get class/CL_SALV_TABLE
```

## Using fixtures directly (no server)

```typescript
import { fixtures, load } from '@abapify/adt-fixtures';

// Handle — lazy, nothing loaded yet
const handle = fixtures.transport.single;
console.log(handle.path); // 'transport/single.xml'

// Load when actually needed
const xml = await handle.load();

// Or by path
const xml2 = await load('transport/single.xml');
```

The fixtures library is **lazy** — nothing reads from disk until `.load()`
runs, so importing it has no startup cost.

## Adding a new fixture

1. Capture the real SAP response:

   ```bash
   adt fetch /sap/bc/adt/cts/transportrequests/DEVK900001 -o tmp/transport.xml
   ```

2. **Sanitize** — replace every real value with a `MOCK` / `TESTUSER` /
   `MOCK900001` placeholder. The raw fixture goes to git, so nothing with a
   real system name, username, or transport number is allowed.

3. Drop it into the fixtures tree inside `packages/adt-fixtures/src/fixtures/`:

   ```
   packages/adt-fixtures/src/fixtures/
     transport/
       mynew.xml      ← here
   ```

4. Register it in `src/fixtures.ts`:

   ```ts
   const registry = {
     transport: {
       single: 'transport/single.xml',
       mynew: 'transport/mynew.xml', // ← added
     },
   } as const;
   ```

5. Build the package:

   ```bash
   bunx nx build adt-fixtures
   ```

See [`adt-fixtures` package guide](/sdk/packages/adt-fixtures) for the full
convention.

## Adding a new mock route

The mock server dispatches through `matchRoute(method, url)` in
`packages/adt-fixtures/src/mock-server/routes.ts`. To add an endpoint:

1. Capture and register the fixture (previous section).
2. Add a branch to `matchRoute` matching your method + URL pattern.
3. Return a `RouteResult` with the loaded fixture body and appropriate
   status / content-type.
4. Add a test to `packages/adt-fixtures/tests/` that exercises the new
   route end-to-end.

## Troubleshooting

| Error                                  | Cause                                                 | Fix                                                                      |
| -------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------ |
| `404 No route for GET /sap/bc/adt/...` | Endpoint not registered                               | Add a `matchRoute` branch (see above)                                    |
| `Security session full`                | Test didn't call `mock.stop()` / cookie carried over  | One `createMockAdtServer()` per test; `await mock.stop()` in `afterEach` |
| `CSRF token mismatch`                  | CLI reused an old token against a new server instance | Restart the CLI / use a fresh auth file per mock run                     |
| `ECONNREFUSED`                         | Server stopped before test finished                   | Increase test timeout; check order of awaits                             |
| Real JFrog URLs leaking in CI          | `bun.lock` not in `.git/info/exclude`                 | Keep it excluded (see root `AGENTS.md`)                                  |

## See also

- [`adt-fixtures` package](/sdk/packages/adt-fixtures)
- [CI pipeline integration](./ci-pipeline)
- [`adt fetch`](/cli/fetch) — capture raw responses to turn into fixtures
- Repository rules in `.agents/rules/` — especially `development/tmp-folder-testing.md`
