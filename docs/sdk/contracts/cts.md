---
title: CTS — Transports
description: Change and Transport System endpoints.
---

# `client.adt.cts`

Change & Transport System. Covers transport requests + tasks, search, value
helps, user actions (release, set status, …), search configurations, and
transport checks.

## Sub-namespaces

### `client.adt.cts.transportrequests`

| Method                                          | HTTP    | Path                                         | Summary                       |
| ----------------------------------------------- | ------- | -------------------------------------------- | ----------------------------- |
| `.list(params?)`                                | GET     | `/sap/bc/adt/cts/transportrequests`          | List transports               |
| `.get(trkorr)`                                  | GET     | `/sap/bc/adt/cts/transportrequests/{trkorr}` | Get one                       |
| `.post()`                                       | POST    | `/sap/bc/adt/cts/transportrequests`          | Create                        |
| `.postAction(trkorr)`                           | POST    | `/sap/bc/adt/cts/transportrequests/{trkorr}` | User action                   |
| `.put(trkorr)`                                  | PUT     | `/sap/bc/adt/cts/transportrequests/{trkorr}` | Update                        |
| `.delete(trkorr)`                               | DELETE  | `/sap/bc/adt/cts/transportrequests/{trkorr}` | Delete                        |
| `.reference(...)`                               | GET     | `.../reference`                              | Resolve transport reference   |
| `.valuehelp.attribute/target/object/ctsproject` | GET     | `.../valuehelp/...`                          | Value help lookups            |
| `.searchconfiguration.configurations.*`         | GET/PUT | `.../searchconfiguration/configurations`     | Search config CRUD            |
| `.searchconfiguration.metadata()`               | GET     | `.../searchconfiguration/metadata`           | Metadata                      |
| `.useraction.*`                                 | POST    | `/sap/bc/adt/cts/transportrequests/{trkorr}` | Release / change owner / etc. |

### `client.adt.cts.transports`

| Method           | HTTP | Path                         | Summary           |
| ---------------- | ---- | ---------------------------- | ----------------- |
| `.list(params?)` | GET  | `/sap/bc/adt/cts/transports` | Search transports |

### `client.adt.cts.transportchecks`

| Method    | HTTP | Path                              | Summary          |
| --------- | ---- | --------------------------------- | ---------------- |
| `.list()` | GET  | `/sap/bc/adt/cts/transportchecks` | Transport checks |

## Schema

Source: [`adt-contracts/src/adt/cts/`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/src/adt/cts)
Response: `transportmanagment*` schemas from `adt-schemas`.

## Example

```ts
const list = await client.adt.cts.transportrequests.list({ user: 'USER' });
const single = await client.adt.cts.transportrequests.get('DEVK900001');
```

## See also

- [CLI `import transport`](../../cli/overview)
- [`adt-plugin-gcts`](../packages/adt-plugin-gcts)
