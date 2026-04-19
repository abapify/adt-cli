---
title: OO — Classes & Interfaces
description: ABAP classes, interfaces, and classrun.
---

# `client.adt.oo`

Full CRUD for ABAP object-oriented artifacts, plus `classrun` for
executing classes as programs.

## Sub-namespaces

### `client.adt.oo.classes`

Generated via the `crud()` helper — exposes `list`, `get(name)`, `post`,
`put(name)`, `delete(name)` at `/sap/bc/adt/oo/classes/...`, plus
include-source endpoints (`source/main`, `definitions`, `implementations`,
`testclasses`, `macros`).

### `client.adt.oo.interfaces`

Same CRUD surface for `/sap/bc/adt/oo/interfaces/...`.

### `client.adt.oo.classrun`

| Method             | HTTP | Path                                  | Summary             |
| ------------------ | ---- | ------------------------------------- | ------------------- |
| `.post(classname)` | POST | `/sap/bc/adt/oo/classrun/{classname}` | Run class (like F9) |

## Schema

Source: [`adt-contracts/src/adt/oo/`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/src/adt/oo)
Schemas: `classes`, `interfaces`, `abapsource` from `adt-schemas`.

## Example

```ts
const cls = await client.adt.oo.classes.get('ZCL_DEMO');
const src = await client.adt.oo.classes.source.main.get('ZCL_DEMO');
const out = await client.adt.oo.classrun.post('ZCL_DEMO');
```

## See also

- [`adk`](../packages/adk) — AdkClass / AdkInterface facades
