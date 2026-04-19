---
title: Activation
description: Activate ABAP objects.
---

# `client.adt.activation`

## Methods

| Method                    | HTTP | Path                                                | Summary          |
| ------------------------- | ---- | --------------------------------------------------- | ---------------- |
| `.activate.post(params?)` | POST | `/sap/bc/adt/activation{?method,preauditRequested}` | Activate objects |

Request body: `adtcore:objectReferences`.

## Schema

Source: [`adt-contracts/src/adt/activation/index.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/src/adt/activation/index.ts)
Body/response schema: `adtcore`.

## Example

```ts
await client.adt.activation.activate.post(
  { preauditRequested: true },
  {
    objectReferences: {
      objectReference: [{ uri: '/sap/bc/adt/oo/classes/zcl_demo' }],
    },
  },
);
```

## See also

- [`adk`](../packages/adk) — `AdkObject.save()` triggers activation automatically
- CLI `adt activate`
