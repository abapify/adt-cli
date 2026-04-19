---
title: AUnit
description: ABAP Unit test runs.
---

# `client.adt.aunit`

## Methods

| Method | HTTP | Path | Summary |
|--------|------|------|---------|
| `.testruns.post()` | POST | `/sap/bc/adt/abapunit/testruns` | Execute ABAP Unit test run |

Headers:

- `Accept: application/vnd.sap.adt.abapunit.testruns.result.v2+xml`
- `Content-Type: application/vnd.sap.adt.abapunit.testruns.config.v4+xml`

## Schema

Source: [`adt-contracts/src/adt/aunit/index.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/src/adt/aunit/index.ts)
Request: `aunitRun`, response: `aunitResult`.

Also exports `extractCoverageMeasurementId()` and the `CoverageLinkCandidate`
types for wiring AUnit runs to coverage.

## Example

```ts
const result = await client.adt.aunit.testruns.post(runConfigBody);
```

## See also

- [`adt-aunit`](../packages/adt-aunit) — CLI plugin with JUnit output
- [Runtime / Traces](./runtime-traces) — coverage endpoints
