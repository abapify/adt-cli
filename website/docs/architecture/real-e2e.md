---
title: Real-SAP E2E Harness
sidebar_position: 6
---

# Real-SAP E2E Harness

Most of the repository's tests run against the [mock ADT
server](./mock-server). A separate, opt-in suite runs against a **real**
SAP system so we can:

- Keep our synthetic XSD/XML fixtures honest against the SAP contract.
- Smoke-test the compiled CLI binary (auth, session, CSRF, parsing) end-to-end.
- Capture new fixtures directly from live responses.

The harness lives in `packages/adt-cli/tests/real-e2e/`. It is **not**
part of the default `nx test` run and is never executed in CI without
provisioned credentials.

## Files

```
packages/adt-cli/tests/real-e2e/
├── helpers.ts                       — describeReal / getRealClient / runRealCli / captureFixture
├── README.md                        — running & safety policy
├── smoke.real.test.ts               — baseline: info, discovery
├── backfill-synthetic.real.test.ts  — probe endpoints that synthesise fixtures today
├── parity.e03-badi.real.test.ts
├── parity.e13-rfc.real.test.ts
├── parity.e14-flp.real.test.ts
└── parity.e15-wb.real.test.ts
```

A matching `vitest.real.config.ts` picks up only `tests/real-e2e/**`, so
accidental runs of `vitest` don't trigger these.

## Harness API

```ts
import {
  describeReal,
  getRealClient,
  runRealCli,
  captureFixture,
} from './helpers';
```

| Symbol             | What it does                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| `describeReal`     | Wraps `describe` and auto-skips when the real session is unavailable. Has `.write()` for gated writes.  |
| `getRealClient()`  | Builds a typed `AdtClient` from `~/.adt/sessions/<SID>.json` — complete with OAuth refresh + CSRF.      |
| `runRealCli([…])`  | Spawns the compiled CLI (`packages/adt-cli/dist/bin/adt.mjs`) as a subprocess with the current session. |
| `captureFixture()` | Persists a real response under `packages/adt-fixtures/src/fixtures/<path>/` for future mock routes.     |

## Skip gating

A `describeReal` block is skipped at the suite level if any of the following:

- `ADT_SKIP_REAL_E2E=1` is set.
- The session file `~/.adt/sessions/<SID>.json` is missing.
- (For `describeReal.write(…)` blocks) `ADT_REAL_E2E_WRITE=1` is not set.

Block-level skipping keeps the default test output clean and ensures a
stock laptop/CI produces a green run.

## Environment variables

| Variable               | Effect                                                             |
| ---------------------- | ------------------------------------------------------------------ |
| `ADT_REAL_SID`         | Target SID (default `TRL`).                                        |
| `ADT_SKIP_REAL_E2E=1`  | Skip all real-e2e blocks, even if a session exists.                |
| `ADT_REAL_E2E_WRITE=1` | Opt-in to `describeReal.write(...)` blocks (locks / PUT / DELETE). |

## Running

```bash
# Via Nx (preferred)
bunx nx run adt-cli:test:real

# Directly via Vitest
cd packages/adt-cli
npx vitest run --config ./vitest.real.config.ts

# Single file
npx vitest run --config ./vitest.real.config.ts tests/real-e2e/smoke.real.test.ts
```

## Safety policy

1. **Read-only by default.** The `describeReal` default API only runs
   GET/POST-search/discovery calls.
2. **Writes are explicit.** `describeReal.write(...)` blocks are
   skipped unless `ADT_REAL_E2E_WRITE=1` is set — even if a session is
   present.
3. **Unique names.** Because of [BTP stale CTS locks](./adk#object-type-quirks-worth-knowing),
   write tests that create/delete objects use unique names per run
   (timestamp or UUID suffix).

## Real-SAP findings on TRL (2025-11)

The "backfill sweep" on a BTP Trial (TRL) tenant surfaced several
endpoints where the CLI / MCP surface ships but the tenant does not
implement the call. The contracts and synthetic fixtures remain
correct; we simply could not promote them to real captures from TRL.

| Area                                                                            | Endpoint                                            | Result on TRL                                 | Action                                                                |
| ------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------- | -------------- | ------------------------------------------------------ |
| STRUST cert management (E04)                                                    | `/sap/bc/adt/system/security/pses`                  | **404 Not Found**                             | Synthetic fixtures only; needs on-prem.                               |
| gCTS plugin (E07)                                                               | `/sap/bc/cts_abapvcs/repository`, `/…/config`       | **403 Forbidden (UC gate)**                   | gCTS disabled on BTP Trial; on-prem/S4HC needed.                      |
| BAdI / Enhancements (E03)                                                       | `/sap/bc/adt/enhancements/*`                        | **403 "No authorization"**                    | Synthetic `enhancements/enhoxhh/single.xml` — awaits on-prem capture. |
| Workbench navigation: callers / callees (E15)                                   | `/informationsystem/callers                         | callees`, `/abapsource/callers                | callees`                                                              | **404** on TRL | Surface retained for on-prem; synthetic fixtures only. |
| Workbench navigation: "go to definition" (E15)                                  | `/sap/bc/adt/navigation/target` (POST)              | **400 "I::000"**                              | Body shape undocumented; stub only.                                   |
| Where-used (E15)                                                                | `/informationsystem/usageReferences/{scope,search}` | **PASS** (187 hits for `CL_ABAP_UNIT_ASSERT`) | Real fixtures captured, legacy `/usages` MCP tool retired.            |
| Fiori Launchpad (E14)                                                           | `/sap/bc/adt/flp/*`                                 | **PASS**                                      | Real fixtures in the registry.                                        |
| RFC over SOAP (E13)                                                             | `/sap/bc/soap/rfc`                                  | **PASS**                                      | Real round-trip tested.                                               |
| Core: discovery, info, search, fetch, ls, packages, CTS, activation, aUnit, ATC | various                                             | **PASS**                                      | Stable since the initial v2 migration.                                |

These results are mirrored per-epic inside the repository's
`docs/roadmap/epics/*.md` files (under "Real-SAP verification" /
"Open questions" sections) — see [Roadmap](../project-roadmap/overview).

## See also

- [Architecture → Mock server](./mock-server)
- [Architecture → Contracts pipeline](./contracts-pipeline)
- [`tests/real-e2e/README.md`](https://github.com/abapify/adt-cli/blob/main/packages/adt-cli/tests/real-e2e/README.md)
