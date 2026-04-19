---
title: package
sidebar_position: 8
description: ABAP package CRUD — create / list / get / delete / activate / stat.
---

# `adt package`

ABAP package operations. Packages (type `DEVC`) are the top-level container for
repository objects.

## Subcommands

| Command | Description |
| --- | --- |
| `adt package create <name> <description>` | Create a new ABAP package. |
| `adt package list <name>` | List objects and subpackages in an ABAP package. |
| `adt package get <name>` | Get details about a specific ABAP package. |
| `adt package delete <name>` | Delete an ABAP package. |
| `adt package activate <names...>` | Activate one or more ABAP packages. |
| `adt package stat <name>` | Check if an ABAP package exists (exit `0`=found, `10`=not found). |

`adt get package <name>` is a legacy alias for `adt package get <name>`.

## Options

### `create`

| Flag | Description |
| --- | --- |
| `-s, --super-package <pkg>` | Parent (super) package name. |
| `-t, --transport <corrnr>` | Transport request number. |
| `--no-error-existing` | Do not error if package already exists. |
| `--json` | Output result as JSON. |

### `list`

| Flag | Description |
| --- | --- |
| `-r, --recursive` | Include objects from subpackages recursively. |
| `-l, --long` | Long output — include object type and package columns. |
| `--subpackages-only` | List only subpackages, not objects. |
| `--json` | Output as JSON. |

### `get` (alias for `adt get package <name>`)

| Flag | Description |
| --- | --- |
| `--json` | Output as JSON. |
| `--objects` | List objects in the package. |
| `--no-sub-packages` | Exclude subpackages when listing objects. |

### `delete`

| Flag | Description |
| --- | --- |
| `-t, --transport <corrnr>` | Transport request number. |
| `-y, --yes` | Skip confirmation prompt. |
| `--json` | Output result as JSON. |

### `activate`

| Flag | Description |
| --- | --- |
| `--json` | Output result as JSON. |

### `stat`

| Flag | Description |
| --- | --- |
| `--json` | Output result as JSON. |

## Examples

```bash
# Create in $TMP
adt package create $ZDEMO "Demo sandbox" -s $TMP --no-error-existing

# Create a transportable package
adt package create ZDEMO_PKG "Demo package" -s ZPARENT -t DEVK900001

# Inspect
adt package get ZDEMO_PKG --objects
adt package list ZDEMO_PKG -r -l --json

# Scripted existence check
adt package stat ZDEMO_PKG
echo $?            # 0 if present, 10 if missing

# Cleanup
adt package delete ZDEMO_PKG -t DEVK900001 -y
```

## See also

- [`import package`](./import) — export a package to disk
- [`checkout`](./checkout) — same, abapGit-formatted
- `@abapify/adk` — `AdkPackage`
