---
title: Discovery
description: AtomPub service discovery document.
---

# `client.adt.discovery`

Returns the ADT service discovery document (AtomPub format) describing all
available workspaces and collections.

## Methods

| Method            | HTTP | Path                    | Summary                  |
| ----------------- | ---- | ----------------------- | ------------------------ |
| `.getDiscovery()` | GET  | `/sap/bc/adt/discovery` | AtomPub service document |

## Schema

Source: [`adt-contracts/src/adt/discovery/index.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/src/adt/discovery/index.ts)
Response schema: [`adt-schemas/discovery`](../packages/adt-schemas)

## Example

```ts
const doc = await client.adt.discovery.getDiscovery();
for (const ws of doc.service?.workspace ?? []) {
  console.log(
    ws.title,
    ws.collection?.map((c) => c.href),
  );
}
```
