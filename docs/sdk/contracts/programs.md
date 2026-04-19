---
title: Programs & Includes
description: ABAP reports (programs) and their includes.
---

# `client.adt.programs`

## Sub-namespaces

### `client.adt.programs.programs`

CRUD for reports under `/sap/bc/adt/programs/programs/...` (source
endpoints included).

### `client.adt.programs.includes`

CRUD for includes under `/sap/bc/adt/programs/includes/...`.

## Schema

Source: [`adt-contracts/src/adt/programs/`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/src/adt/programs)
Response types: `ProgramResponse`, `IncludeResponse`.

## Example

```ts
const report = await client.adt.programs.programs.get('ZREPORT_HELLO');
const src = await client.adt.programs.programs.source.main.get('ZREPORT_HELLO');
```
