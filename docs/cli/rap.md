---
title: rap — bdef / srvd / srvb
sidebar_position: 6
description: RAP behavior definitions, service definitions and service bindings.
---

# `adt bdef` / `adt srvd` / `adt srvb`

CRUD for RAP (ABAP RESTful Application Programming Model) artifacts.

| Type | Command | File extension | ADT URI |
| --- | --- | --- | --- |
| Behavior Definition | `adt bdef` | `.abdl` | `/sap/bc/adt/bo/behaviordefinitions` |
| Service Definition | `adt srvd` | `.asrvd` | `/sap/bc/adt/ddic/srvd/sources` |
| Service Binding    | `adt srvb` | — | `/sap/bc/adt/businessservices/bindings` |

## Subcommands

### `bdef` / `srvd`

Standard source CRUD (see [`objects`](./objects) for the shared surface):

```
adt bdef create <name> <description> <package>
adt bdef read <name>
adt bdef write <name> [file|-] [--transport] [--activate]
adt bdef activate <names...>
adt bdef delete <name> [-y] [--transport]
```

### `srvb`

Service bindings are metadata-only + *publish/unpublish* (activation ≠ publish
for Gateway services):

| Command | Description |
| --- | --- |
| `adt srvb create <name> <description> <package>` | Create a new ABAP service binding. |
| `adt srvb read <name>` | Read an ABAP service binding. |
| `adt srvb publish <name>` | Publish (activate) an ABAP service binding via Gateway. |
| `adt srvb unpublish <name>` | Unpublish (deactivate) an ABAP service binding. |
| `adt srvb activate <names...>` | Activate one or more service bindings. |
| `adt srvb delete <name>` | Delete an ABAP service binding. |

## Options

Same as [`objects`](./objects):

- `create`: `-t, --transport <corrnr>`, `--no-error-existing`, `--json`
- `read`: `--json`
- `write` (*bdef* / *srvd* only): `[file]`, `-t, --transport`, `--activate`
- `activate` / `publish` / `unpublish`: `--json`
- `delete`: `-t, --transport`, `-y, --yes`, `--json`

## Examples

```bash
# Behavior definition
adt bdef create ZBP_I_CUSTOMER "Behavior for ZI_CUSTOMER" ZMYPKG
adt bdef write ZBP_I_CUSTOMER bp_customer.abdl --activate

# Service definition + binding + publish
adt srvd create ZUI_CUSTOMER "Customer service" ZMYPKG
adt srvd write ZUI_CUSTOMER ui_customer.asrvd --activate

adt srvb create ZUI_CUSTOMER_O4 "OData V4 binding" ZMYPKG
adt srvb publish ZUI_CUSTOMER_O4
```

## See also

- [`cds`](./cds) — DDL / DCL sources referenced from behavior definitions
- [`objects`](./objects) — shared CRUD surface
- `@abapify/adk` — `AdkBehaviorDefinition`, `AdkServiceDefinition`, `AdkServiceBinding`
