---
title: Packages
description: ABAP packages (DEVC) CRUD.
---

# `client.adt.packages`

Generated via `crud()` against `/sap/bc/adt/packages/...`. Names preserve
case (packages are uppercase; URL-encoded, no lowercase transform).

## Methods

| Method           | HTTP   | Path                          | Summary                    |
| ---------------- | ------ | ----------------------------- | -------------------------- |
| `.list()`        | GET    | `/sap/bc/adt/packages`        | List packages              |
| `.get(name)`     | GET    | `/sap/bc/adt/packages/{name}` | Get one                    |
| `.post(params?)` | POST   | `/sap/bc/adt/packages`        | Create (pass `{ corrNr }`) |
| `.put(name)`     | PUT    | `/sap/bc/adt/packages/{name}` | Update                     |
| `.delete(name)`  | DELETE | `/sap/bc/adt/packages/{name}` | Delete                     |

Accept: `application/vnd.sap.adt.packages.v2+xml, …v1+xml`
Content-Type: `application/vnd.sap.adt.packages.v2+xml`

## Schema

Source: [`adt-contracts/src/adt/packages/index.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/src/adt/packages/index.ts)
Schema: `packagesV1`.

```ts
import type { Package } from '@abapify/adt-contracts';
```

## Example

```ts
const pkg = await client.adt.packages.get('ZABAPGIT_EXAMPLES');
console.log(pkg.package?.name, pkg.package?.attributes?.packageType);

await client.adt.packages.post({ corrNr: 'DEVK900001' });
```
