---
title: objects — class / interface / program / include
sidebar_position: 3
description: CRUD for classic ABAP source objects.
---

# `adt class` / `adt interface` / `adt program` / `adt include`

Generic CRUD command groups for classic ABAP source objects. All four share the
same surface (built with `buildObjectCrudCommands`): `create`, `read`, `write`,
`activate`, `delete`.

## Subcommands

| Command | Description |
| --- | --- |
| `adt <type> create <name> <description> <package>` | Create a new object. |
| `adt <type> read <name>` | Read source (prints to stdout) or metadata (`--json`). |
| `adt <type> write <name> [file\|-]` | Write source from file or stdin. |
| `adt <type> activate <names...>` | Activate one or more objects. |
| `adt <type> delete <name>` | Delete an object. |

Replace `<type>` with `class`, `interface`, `program`, or `include`.

## Options

### `create`

| Flag | Description |
| --- | --- |
| `-t, --transport <corrnr>` | Transport request number. |
| `--no-error-existing` | Skip if the object already exists (default: error). |
| `--json` | Output as JSON. |

### `read`

| Flag | Description |
| --- | --- |
| `--json` | Output metadata as JSON (no source). |

### `write`

| Flag | Description |
| --- | --- |
| `[file]` | Source file path — `-` reads from stdin (default). |
| `-t, --transport <corrnr>` | Transport request number. |
| `--activate` | Activate after writing. |

### `activate`

| Flag | Description |
| --- | --- |
| `--json` | Output result as JSON. |

### `delete`

| Flag | Description |
| --- | --- |
| `-t, --transport <corrnr>` | Transport request number. |
| `-y, --yes` | Skip confirmation prompt. |
| `--json` | Output result as JSON. |

## Examples

```bash
# Create a class
adt class create ZCL_DEMO "My demo class" ZMYPKG -t DEVK900001

# Read its source
adt class read ZCL_DEMO > zcl_demo.clas.abap

# Edit externally, then write back and activate
adt class write ZCL_DEMO zcl_demo.clas.abap --transport DEVK900001 --activate

# Pipe from stdin
echo "REPORT zdemo. WRITE 'hi'." | adt program write ZDEMO - --activate

# Batch activate
adt interface activate ZIF_DEMO1 ZIF_DEMO2 ZIF_DEMO3 --json

# Delete
adt class delete ZCL_DEMO -t DEVK900001 -y
```

## See also

- [`source`](./source) — generic source read/write for any object URI
- [`lock`](./lock) — explicit lock management
- [`check`](./check) — syntax check before `activate`
- `@abapify/adk` — object CRUD implementations
