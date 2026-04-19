---
title: Runtime / Traces
description: ABAP runtime coverage measurements.
---

# `client.adt.runtime.traces`

ABAP runtime endpoints — primarily coverage (statement traces and
measurements) used to wire AUnit coverage to JaCoCo/SonarQube.

## Sub-namespaces

### `client.adt.runtime.traces.coverage.measurements`

| Method       | HTTP | Path                                               | Summary                          |
| ------------ | ---- | -------------------------------------------------- | -------------------------------- |
| `.post(...)` | POST | `/sap/bc/adt/runtime/traces/coverage/measurements` | Start/fetch coverage measurement |

### `client.adt.runtime.traces.coverage.statements`

| Method      | HTTP | Path                                             | Summary                  |
| ----------- | ---- | ------------------------------------------------ | ------------------------ |
| `.get(...)` | GET  | `/sap/bc/adt/runtime/traces/coverage/statements` | Statement-level coverage |

## Schema

Source: [`adt-contracts/src/adt/runtime/traces/`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/src/adt/runtime/traces)

## See also

- [AUnit](./aunit) — `extractCoverageMeasurementId` helper
- [`adt-aunit`](../packages/adt-aunit) — JaCoCo output
