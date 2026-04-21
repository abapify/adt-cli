---
title: ATC
description: ABAP Test Cockpit (ATC) runs, worklists, results, customizing.
---

# `client.adt.atc`

## Methods

### `client.adt.atc.customizing`

| Method   | HTTP | Path                          | Summary                           |
| -------- | ---- | ----------------------------- | --------------------------------- |
| `.get()` | GET  | `/sap/bc/adt/atc/customizing` | Check variants, exemption reasons |

### `client.adt.atc.runs`

| Method           | HTTP | Path                                           | Summary        |
| ---------------- | ---- | ---------------------------------------------- | -------------- |
| `.post(params?)` | POST | `/sap/bc/adt/atc/runs{?worklistId,clientWait}` | Run ATC checks |

### `client.adt.atc.worklists`

| Method             | HTTP | Path                                       | Summary                       |
| ------------------ | ---- | ------------------------------------------ | ----------------------------- |
| `.get(id)`         | GET  | `/sap/bc/adt/atc/worklists/{id}`           | Retrieve worklist (generated) |
| `.put(id)`         | PUT  | `/sap/bc/adt/atc/worklists/{id}`           | Update (generated)            |
| `.create(params?)` | POST | `/sap/bc/adt/atc/worklists{?checkVariant}` | Create new worklist           |

### `client.adt.atc.results`

Generated contract for `/sap/bc/adt/atc/results` — see source.

## Schema

Source: [`adt-contracts/src/adt/atc/index.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/src/adt/atc/index.ts)
Request/response: `atc`, `atcworklist`, `atcRun` schemas.

## Example

```ts
const { worklistId } = await client.adt.atc.worklists.create({
  checkVariant: 'DEFAULT',
});
await client.adt.atc.runs.post({ worklistId });
```

## See also

- [`adt-atc`](../packages/adt-atc) — CLI plugin with SARIF/GitLab output
