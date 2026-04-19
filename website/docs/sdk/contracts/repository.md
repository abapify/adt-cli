---
title: Repository (Information System)
description: Repository search and usage references.
---

# `client.adt.repository`

Covers the repository information system — ABAP object search and
where-used.

## Sub-namespaces

### `client.adt.repository.informationsystem.search`

| Method                 | HTTP | Path                                              | Summary                 |
| ---------------------- | ---- | ------------------------------------------------- | ----------------------- |
| `.quickSearch(params)` | GET  | `/sap/bc/adt/repository/informationsystem/search` | Repository quick search |

### `client.adt.repository.informationsystem.usagereferences`

| Method                 | HTTP | Path                                                       | Summary                  |
| ---------------------- | ---- | ---------------------------------------------------------- | ------------------------ |
| `.post(uri, body)`     | POST | `/sap/bc/adt/repository/informationsystem/usageReferences` | Where-used               |
| `.snippets(uri, body)` | POST | `.../usageReferences/snippets`                             | Where-used code snippets |

## Schema

Source: [`adt-contracts/src/adt/repository/informationsystem/`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/src/adt/repository/informationsystem)

## Example

```ts
const results =
  await client.adt.repository.informationsystem.search.quickSearch({
    query: 'ZCL_DEMO',
    maxResults: 50,
  });
```

## See also

- CLI `adt search`
