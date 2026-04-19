---
title: cds — ddl / dcl
sidebar_position: 5
description: CDS Data Definition Language sources and access controls.
---

# `adt ddl` / `adt dcl`

CRUD for CDS source objects:

- **DDL** (`DDLS`) — Data Definition Language sources (views, entities, ...).
- **DCL** (`DCLS`) — Data Control Language sources (access controls / PFCG).

Both use the generic CRUD builder, so options match [`objects`](./objects).

## Subcommands

| Command                                         | Description                           |
| ----------------------------------------------- | ------------------------------------- |
| `adt ddl create <name> <description> <package>` | Create a new DDL source.              |
| `adt ddl read <name>`                           | Print the `.asddls` source to stdout. |
| `adt ddl write <name> [file\|-]`                | Write source from file or stdin.      |
| `adt ddl activate <names...>`                   | Activate one or more DDL sources.     |
| `adt ddl delete <name>`                         | Delete a DDL source.                  |
| `adt dcl ...`                                   | Same surface for DCL sources.         |

## Options

Identical to [`objects`](./objects):

- `create`: `-t, --transport`, `--no-error-existing`, `--json`
- `read`: `--json`
- `write`: `[file]`, `-t, --transport`, `--activate`
- `activate`: `--json`
- `delete`: `-t, --transport`, `-y, --yes`, `--json`

## Examples

```bash
# Create a CDS view
adt ddl create ZI_CUSTOMER "Customer view" ZMYPKG -t DEVK900001

# Edit
adt ddl read ZI_CUSTOMER > zi_customer.ddls.asddls
$EDITOR zi_customer.ddls.asddls
adt ddl write ZI_CUSTOMER zi_customer.ddls.asddls --activate

# DCL role
adt dcl create ZI_CUSTOMER_ACCESS "Customer access" ZMYPKG
adt dcl write ZI_CUSTOMER_ACCESS access.dcls.asdcls --activate
```

## See also

- [`rap`](./rap) — behavior definitions, service definitions, service bindings
- `@abapify/adk` — `AdkDdlSource`, `AdkDclSource`
- `acds` — the CDS DDL parser used by `checkin`/`checkout`
