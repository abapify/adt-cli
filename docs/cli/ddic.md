---
title: ddic — domain / dataelement / table / structure
sidebar_position: 4
description: DDIC metadata objects — domains, data elements, tables, structures.
---

# `adt domain` / `adt dataelement` / `adt table` / `adt structure`

CRUD for Data Dictionary (DDIC) metadata objects.

Domains, data elements, tables, and structures are **metadata-only** — they do
not have an editable `source/main` payload like classes or programs (structure
changes are driven by XML metadata). The `write` subcommand is therefore
omitted; use `checkin` / `import` for full payload updates.

## Subcommands

| Command | Description |
| --- | --- |
| `adt <type> create <name> <description> <package>` | Create a new object. |
| `adt <type> read <name>` | Read metadata. |
| `adt <type> activate <names...>` | Activate one or more objects. |
| `adt <type> delete <name>` | Delete an object. |

Replace `<type>` with `domain`, `dataelement`, `table`, or `structure`.

## Options

Same as [`objects`](./objects):

- `create`: `-t, --transport`, `--no-error-existing`, `--json`
- `read`: `--json`
- `activate`: `--json`
- `delete`: `-t, --transport`, `-y, --yes`, `--json`

## Examples

```bash
# Create a domain
adt domain create ZDOMAIN_GENDER "Gender M/F" ZMYPKG -t DEVK900001

# Read back as JSON
adt dataelement read ZDTEL_GENDER --json

# Activate a batch
adt table activate ZTAB_FOO ZTAB_BAR

# Delete
adt structure delete ZSTR_TMP --transport DEVK900001 -y
```

## See also

- [`checkin`](./checkin) — full metadata roundtrip via serialised files
- [`import`](./import) — export DDIC metadata to disk
- `@abapify/adk` — `AdkDomain`, `AdkDataElement`, `AdkTable`, `AdkStructure`
