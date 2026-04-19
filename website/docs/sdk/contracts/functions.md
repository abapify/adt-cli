---
title: Function Groups & Modules
description: Function groups and nested function modules.
---

# `client.adt.functions`

Function modules (FMs) are nested under groups following the SAP URL pattern:

```
/sap/bc/adt/functions/groups/{groupName}/fmodules/{fmName}
```

## Sub-namespaces

### `client.adt.functions.groups`

CRUD for function groups at `/sap/bc/adt/functions/groups/{groupName}`.

### `client.adt.functions.groups.fmodules`

CRUD for function modules, including source endpoints:

| Method                     | HTTP   | Path                                | Summary       |
| -------------------------- | ------ | ----------------------------------- | ------------- |
| `.get(fmName)`             | GET    | `.../fmodules/{fmName}`             | Get FM        |
| `.post(...)`               | POST   | `.../fmodules`                      | Create        |
| `.put(fmName)`             | PUT    | `.../fmodules/{fmName}`             | Update        |
| `.delete(fmName)`          | DELETE | `.../fmodules/{fmName}`             | Delete        |
| `.source.main.get(fmName)` | GET    | `.../fmodules/{fmName}/source/main` | Source        |
| `.source.main.put(fmName)` | PUT    | `.../fmodules/{fmName}/source/main` | Update source |

## Schema

Source: [`adt-contracts/src/adt/functions/`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/src/adt/functions)

## Example

```ts
const fm = await client.adt.functions.groups.fmodules.get(
  'ZFG_DEMO',
  'ZFM_HELLO',
);
```

:::caution FM create quirks
SAP ignores `processingType` on POST. See the [`adk`](../packages/adk) docs
(`AdkFunctionModule.savePendingSources()`) for the workaround.
:::

## See also

- [`adk`](../packages/adk) — `AdkFunctionGroup`, `AdkFunctionModule`
