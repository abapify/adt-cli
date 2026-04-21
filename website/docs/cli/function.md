---
title: function — groups & modules
sidebar_position: 7
description: Function group and function module CRUD.
---

# `adt function`

ABAP function group and function module operations.

## Subcommands

```
adt function group   create|read|activate|delete
adt function module  create|read|write|activate|delete
```

### `adt function group` — function groups

Generic CRUD (see [`objects`](./objects)):

| Command                                                    | Description                           |
| ---------------------------------------------------------- | ------------------------------------- |
| `adt function group create <name> <description> <package>` | Create a new function group.          |
| `adt function group read <name>`                           | Read the top include source.          |
| `adt function group activate <names...>`                   | Activate one or more function groups. |
| `adt function group delete <name>`                         | Delete a function group.              |

### `adt function module`

Function modules are children of a function group — every subcommand takes
**both** `<group>` and `<name>` as positional arguments.

| Command                                                   | Description                                       |
| --------------------------------------------------------- | ------------------------------------------------- |
| `adt function module create <group> <name> <description>` | Create a new function module in a function group. |
| `adt function module read <group> <name>`                 | Read source code of a function module.            |
| `adt function module write <group> <name> [file\|-]`      | Write source code to a function module.           |
| `adt function module activate <group> <name>`             | Activate a function module.                       |
| `adt function module delete <group> <name>`               | Delete a function module.                         |

## Options

### `module create`

| Flag                       | Description                                                          |
| -------------------------- | -------------------------------------------------------------------- |
| `-t, --transport <corrnr>` | Transport request number.                                            |
| `--processing-type <type>` | Processing type (`normal`, `rfc`, `update`, ...). Default: `normal`. |
| `--no-error-existing`      | Skip if module already exists (default: error).                      |
| `--json`                   | Output as JSON.                                                      |

### `module read`

| Flag     | Description                          |
| -------- | ------------------------------------ |
| `--json` | Output metadata as JSON (no source). |

### `module write`

| Flag                       | Description                                         |
| -------------------------- | --------------------------------------------------- |
| `[file]`                   | Source file path (use `-` for stdin). Default: `-`. |
| `-t, --transport <corrnr>` | Transport request number.                           |
| `--activate`               | Activate after writing.                             |

### `module activate`

| Flag     | Description     |
| -------- | --------------- |
| `--json` | Output as JSON. |

### `module delete`

| Flag                       | Description               |
| -------------------------- | ------------------------- |
| `-t, --transport <corrnr>` | Transport request number. |
| `-y, --yes`                | Skip confirmation prompt. |
| `--json`                   | Output as JSON.           |

## Examples

```bash
# Function group
adt function group create ZFG_DEMO "Demo group" ZMYPKG -t DEVK900001
adt function group read   ZFG_DEMO

# Function module inside the group
adt function module create ZFG_DEMO Z_HELLO "Hello world" \
    --processing-type rfc -t DEVK900001

adt function module write ZFG_DEMO Z_HELLO z_hello.abap --activate
adt function module read  ZFG_DEMO Z_HELLO

# Cleanup
adt function module delete ZFG_DEMO Z_HELLO -t DEVK900001 -y
adt function group  delete ZFG_DEMO         -t DEVK900001 -y
```

## See also

- [`objects`](./objects) — generic CRUD flags shared by `group`
- `@abapify/adk` — `AdkFunctionGroup`, `AdkFunctionModule`
