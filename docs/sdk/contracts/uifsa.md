---
title: FLP (Fiori Launchpad)
description: Page Builder / UIFSA — Fiori catalogs, groups, tiles.
---

# `client.adt.flp`

:::info Directory vs client name
The directory is named `uifsa` (matching epic E14), but the actual endpoints
live on the Page Builder OData service. The client namespace is `flp` to
match sapcli's `sap flp ...` surface.
:::

Base URL:

```
/sap/opu/odata/UI2/PAGE_BUILDER_PERS/
```

## Sub-namespaces

### `client.adt.flp.catalogs`

| Method | HTTP | Path | Summary |
|--------|------|------|---------|
| `.list()` | GET | `.../CatalogCollection` | List catalogs |
| `.get(id)` | GET | `.../CatalogCollection(id)` | Get one |
| `.chips(id)` | GET | `.../CatalogCollection(id)/Chips` | Tiles in catalog |

### `client.adt.flp.groups`

| Method | HTTP | Path | Summary |
|--------|------|------|---------|
| `.list()` | GET | `.../PageCollection` | List groups/pages |
| `.get(id)` | GET | `.../PageCollection(id)` | Get one |

### `client.adt.flp.tiles`

| Method | HTTP | Path | Summary |
|--------|------|------|---------|
| `.list()` | GET | `.../TileCollection` | List tiles |
| `.get(id)` | GET | `.../TileCollection(id)` | Get one |

## Schema

Source: [`adt-contracts/src/adt/uifsa/`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/src/adt/uifsa)
