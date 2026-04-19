---
title: Check Runs
description: ABAP syntax / check-run execution.
---

# `client.adt.checkruns`

## Methods

| Method                 | HTTP | Path                    | Summary                           |
| ---------------------- | ---- | ----------------------- | --------------------------------- |
| `.checkObjects.post()` | POST | `/sap/bc/adt/checkruns` | Run a syntax/check-run on objects |

- `Accept: application/vnd.sap.adt.checkmessages+xml`
- `Content-Type: application/vnd.sap.adt.checkobjects+xml`

## Schema

Source: [`adt-contracts/src/adt/checkruns/index.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/src/adt/checkruns/index.ts)
Schema: `checkrun` (union: `checkObjectList` for requests, `checkRunReports`
for responses).
