---
title: import
sidebar_position: 13
description: Import ABAP objects, packages, or transports to various formats.
---

# `adt import`

Import ABAP objects to various formats (abapGit, AFF/gCTS, ...).
Lower-level counterpart to [`checkout`](./checkout) with full format-option
support.

## Subcommands

| Command                                                 | Description                                 |
| ------------------------------------------------------- | ------------------------------------------- |
| `adt import object <objectName> [targetFolder]`         | Import a single ABAP object by name.        |
| `adt import package <packageName> [targetFolder]`       | Import an ABAP package and its contents.    |
| `adt import transport <transportNumber> [targetFolder]` | Import a transport request and its objects. |

## Options

### `object`

| Flag                          | Description                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `<objectName>`                | ABAP object name to import (e.g. `ZAGE_DOMA_CASE_SENSITIVE`).                  |
| `[targetFolder]`              | Target folder for output.                                                      |
| `-o, --output <path>`         | Output directory (overrides `targetFolder`).                                   |
| `--format <format>`           | Output format: `abapgit` \| `@abapify/adt-plugin-abapgit`. Default: `abapgit`. |
| `--format-option <key=value>` | Format-specific option (repeatable), e.g. `--format-option folderLogic=full`.  |
| `--debug`                     | Enable debug output.                                                           |

### `package`

| Flag                          | Description                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `<packageName>`               | ABAP package name.                                                                      |
| `[targetFolder]`              | Target folder for output.                                                               |
| `-o, --output <path>`         | Output directory (overrides `targetFolder`).                                            |
| `-t, --object-types <types>`  | Comma-separated object types (e.g. `CLAS,INTF,DDLS`). Default: all supported by format. |
| `--no-sub-packages`           | Exclude subpackages (by default they are included).                                     |
| `--format <format>`           | Output format. Default: `abapgit`.                                                      |
| `--format-option <key=value>` | Repeatable format option.                                                               |
| `--debug`                     | Enable debug output.                                                                    |

### `transport`

| Flag                          | Description                                                 |
| ----------------------------- | ----------------------------------------------------------- |
| `<transportNumber>`           | Transport request number to import.                         |
| `[targetFolder]`              | Target folder for output.                                   |
| `-o, --output <path>`         | Output directory (overrides `targetFolder`).                |
| `-t, --object-types <types>`  | Comma-separated object types.                               |
| `--format <format>`           | Output format. Default: `abapgit`.                          |
| `--format-option <key=value>` | Repeatable format option.                                   |
| `--folder-logic <logic>`      | **[DEPRECATED]** Use `--format-option folderLogic=<logic>`. |
| `--debug`                     | Enable debug output.                                        |

## Examples

```bash
# Single class, abapGit
adt import object ZCL_DEMO ./src

# Package with type filter and subpackages excluded
adt import package $ZDEMO ./repo \
    --object-types CLAS,INTF,DDLS --no-sub-packages

# Transport with format options
adt import transport DEVK900001 ./release \
    --format abapgit \
    --format-option folderLogic=full
```

## See also

- [`checkout`](./checkout) — convenience aliases using abapGit by default
- [`checkin`](./checkin) — inverse (disk → SAP)
- `@abapify/adt-plugin-abapgit` / `@abapify/adt-plugin-gcts` — format plugins
