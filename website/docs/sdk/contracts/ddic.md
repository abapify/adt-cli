---
title: DDIC — Data Dictionary
description: Domains, data elements, tables, structures, table types, DDL/DCL/SRVD sources.
---

# `client.adt.ddic`

Data Dictionary objects — the classic DDIC surface plus the newer CDS-based
artifacts.

## Sub-namespaces

| Namespace                 | Path                                                 | Notes                                   |
| ------------------------- | ---------------------------------------------------- | --------------------------------------- |
| `.domains`                | `/sap/bc/adt/ddic/domains/{name}`                    | DOMA                                    |
| `.dataelements`           | `/sap/bc/adt/ddic/dataelements/{name}`               | DTEL                                    |
| `.structures`             | `/sap/bc/adt/ddic/structures/{name}/objectstructure` | TABL / DS                               |
| `.tables`                 | `/sap/bc/adt/ddic/tables/{name}/objectstructure`     | TABL / DT                               |
| `.tabletypes`             | `/sap/bc/adt/ddic/tabletypes/{name}`                 | TTYP                                    |
| `.tablesettings`          | `/sap/bc/adt/ddic/tablesettings/{name}`              |                                         |
| `.ddl` + `.ddl.sources`   | `/sap/bc/adt/ddic/ddl/...`                           | CDS DDL (DDLS/DDIC view / table entity) |
| `.dcl` + `.dcl.sources`   | `/sap/bc/adt/ddic/dcl/...`                           | CDS DCL (access control)                |
| `.srvd` + `.srvd.sources` | `/sap/bc/adt/ddic/srvd/...`                          | CDS Service Definition                  |

Each object-type namespace mirrors the `crud()` surface (`get`, `list`,
`post`, `put`, `delete`) plus source sub-routes where applicable.

## Schema

Source: [`adt-contracts/src/adt/ddic/`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/src/adt/ddic)

Response types: `DomainResponse`, `DataElementResponse`,
`StructureResponse`, `TableResponse`, `TableTypeResponse`,
`DdlSourceResponse`, `DclSourceResponse`, `SrvdSourceResponse`.

## Example

```ts
const domain = await client.adt.ddic.domains.get('ZDOM_COLOR');
const ddl = await client.adt.ddic.ddl.sources.source.main.get('ZI_CDS_VIEW');
```

## See also

- [`acds`](../packages/acds) — CDS parser
- [`adt-plugin-abapgit`](../packages/adt-plugin-abapgit) — TABL/DDLS handlers
