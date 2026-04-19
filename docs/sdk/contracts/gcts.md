---
title: gCTS
description: git-enabled CTS (cts_abapvcs).
---

# `client.adt.gcts`

:::info Different URL namespace
gCTS is **not** under `/sap/bc/adt/` — it lives at
`/sap/bc/cts_abapvcs/...`. Exposed here as `client.adt.gcts.*` for parity
with sapcli's `sap gcts` surface.
:::

## Sub-namespaces

### `client.adt.gcts.repository`

| Method | HTTP | Path | Summary |
|--------|------|------|---------|
| `.list()` | GET | `/sap/bc/cts_abapvcs/repository` | List repositories |
| `.get(rid)` | GET | `.../repository/{rid}` | Get one |
| `.create(body)` | POST | `.../repository` | Create |
| `.delete(rid)` | DELETE | `.../repository/{rid}` | Delete |
| `.clone(rid)` | POST | `.../repository/{rid}/clone` | Clone |
| `.pullByCommit(rid, ...)` | GET | `.../repository/{rid}/pullByCommit` | Pull by commit |
| `.push(rid)` | GET | `.../repository/{rid}/push` | Push |
| `.switch(rid, branch)` | GET | `.../repository/{rid}/branches/{branch}/switch` | Switch branch |
| `.getCommit(rid, ...)` | GET | `.../repository/{rid}/getCommit` | Resolve commit |
| `.getObjects(rid, ...)` | GET | `.../repository/{rid}/getObjects` | Objects in commit |
| `.update(rid)` | POST | `.../repository/{rid}` | Update repo metadata |

### `client.adt.gcts.branches`

| Method | HTTP | Path | Summary |
|--------|------|------|---------|
| `.list(rid)` | GET | `.../repository/{rid}/branches` | List |
| `.create(rid, ...)` | POST | `.../repository/{rid}/branches` | Create |
| `.delete(rid, name)` | DELETE | `.../repository/{rid}/branches/{name}` | Delete |
| `.switch(rid, currentBranch, ...)` | GET | `.../repository/{rid}/branches/{current}/switch` | Switch |

### `client.adt.gcts.commits`

| Method | HTTP | Path | Summary |
|--------|------|------|---------|
| `.create(rid, body)` | POST | `.../repository/{rid}/commit` | Commit |

### `client.adt.gcts.config`

| Method | HTTP | Path | Summary |
|--------|------|------|---------|
| `.get(rid, key)` | GET | `.../config/{key}` | Read config value |
| `.set(rid, body)` | POST | `.../config` | Set config value |
| `.delete(rid, key)` | DELETE | `.../config/{key}` | Delete config value |

## Schema

Source: [`adt-contracts/src/adt/gcts/`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/src/adt/gcts)

## See also

- [`adt-plugin-gcts`](../packages/adt-plugin-gcts) — format plugin
- [`adt-plugin-gcts-cli`](../packages/adt-plugin-gcts-cli) — `adt gcts …` CLI
