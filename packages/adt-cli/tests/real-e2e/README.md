# real-e2e — SAP-backed end-to-end tests

This directory holds tests that hit a **real** SAP system instead of the in-process mock. They exist to:

- Keep synthetic XSD / XML fixtures honest against the real SAP contract.
- Smoke-test the compiled CLI binary end-to-end (auth, session, CSRF, parsing).
- Act as a capture source for new fixtures (`captureFixture()` helper).

## Scope policy

**Read-only by default.** Write-tests (lock / PUT / DELETE / activate) must
use `describeReal.write(...)` and require an explicit opt-in via
`ADT_REAL_E2E_WRITE=1`. This protects shared Trial / dev systems from
accidental mutation during a routine test run.

## Prerequisites

1. An authenticated ADT session for the target SID (default `TRL`):

   ```bash
   bunx adt auth login --sid TRL
   ```

   Produces `~/.adt/sessions/TRL.json`. If the session file is missing,
   every `describeReal` block is skipped at the suite level — the test
   run stays green on machines without SAP credentials.

2. A built CLI:

   ```bash
   bunx nx build adt-cli
   ```

## Running

Default Nx test runs **exclude** this directory. Invoke explicitly:

```bash
# All real-e2e tests
cd packages/adt-cli
npx vitest run --config ./vitest.real.config.ts

# Via Nx (preferred)
bunx nx run adt-cli:test:real

# A single file
cd packages/adt-cli
npx vitest run --config ./vitest.real.config.ts tests/real-e2e/smoke.real.test.ts
```

## Opt-out / overrides

| Env var                | Effect                                                         |
| ---------------------- | -------------------------------------------------------------- |
| `ADT_SKIP_REAL_E2E=1`  | Skip every `describeReal` block (even if session file exists). |
| `ADT_REAL_SID=<SID>`   | Target a different SID (default `TRL`).                        |
| `ADT_REAL_E2E_WRITE=1` | Unlock `describeReal.write(...)` blocks.                       |

## CI

These tests are **not** part of the default CI pipeline. The Nx `test` target
for `adt-cli` uses `vitest.config.ts` (pattern `tests/e2e/**`) and does not
pick up `tests/real-e2e/**`. CI can add a nightly `test:real` job once
credentials are provisioned.

## Adding a new real-e2e test

```ts
import { describeReal, getRealClient, runRealCli } from './helpers';
import { expect, it } from 'vitest';

describeReal('my feature', () => {
  it('reads something from SAP', async () => {
    const client = await getRealClient();
    const info = await client.adt.core.http.systeminformation.getSystemInfo();
    expect(info.systemID).toBe('TRL');
  });

  it('CLI exits 0 for `adt info`', async () => {
    const res = await runRealCli(['info']);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toMatch(/System ID/);
  });
});
```

For write scenarios:

```ts
describeReal.write('my feature — WRITE', () => {
  it('locks and unlocks a throwaway object', async () => {
    /* ... */
  });
});
```
