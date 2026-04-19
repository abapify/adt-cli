---
title: checkout
sidebar_position: 11
description: Download SAP objects as abapGit-compatible local files.
---

# `adt checkout`

Download ABAP objects to abapGit-compatible local files (disk ← SAP).

`checkout` is a convenience wrapper around [`adt import object`](./import)
and [`adt import package`](./import) that uses shorter, typed subcommands.

## Subcommands

```
adt checkout class        <name> [targetFolder]
adt checkout interface    <name> [targetFolder]
adt checkout program      <name> [targetFolder]
adt checkout domain       <name> [targetFolder]
adt checkout dataelement  <name> [targetFolder]
adt checkout table        <name> [targetFolder]
adt checkout functiongroup <name> [targetFolder]
adt checkout ddl          <name> [targetFolder]
adt checkout dcl          <name> [targetFolder]
adt checkout package      <packageName> [targetFolder]
```

The object-type subcommands map to the SAP 4-letter kinds (`class` → `CLAS`,
`interface` → `INTF`, `program` → `PROG`, `domain` → `DOMA`, `dataelement` →
`DTEL`, `table` → `TABL`, `functiongroup` → `FUGR`, `ddl` → `DDLS`, `dcl` →
`DCLS`).

## Options

### Object subcommands (`class`, `interface`, `program`, ...)

| Flag | Description |
| --- | --- |
| `[targetFolder]` | Target output folder (default: `.`). |
| `-o, --output <path>` | Output directory (overrides `targetFolder`). |
| `--format <format>` | Output format (default: `abapgit`). |
| `--debug` | Enable debug output. |

### `package`

| Flag | Description |
| --- | --- |
| `[targetFolder]` | Target output folder (default: `.`). |
| `-o, --output <path>` | Output directory (overrides `targetFolder`). |
| `-t, --object-types <types>` | Comma-separated object types (e.g. `CLAS,INTF,DDLS`). |
| `--no-sub-packages` | Exclude subpackages. |
| `--format <format>` | Output format (default: `abapgit`). |
| `--debug` | Enable debug output. |

## Examples

```bash
# Checkout a single class to ./src
adt checkout class ZCL_DEMO ./src

# Full package to ./repo, abapGit layout
adt checkout package $ZDEMO ./repo

# Filter object types
adt checkout package $ZDEMO ./repo --object-types CLAS,INTF,DDLS

# Use AFF/gCTS layout instead of abapGit
adt checkout class ZCL_DEMO ./src --format gcts
```

## See also

- [`checkin`](./checkin) — the inverse operation (disk → SAP)
- [`import`](./import) — full-feature import with format-options
- `@abapify/adt-plugin-abapgit` — abapGit serialiser
- `@abapify/adt-plugin-gcts` — gCTS / AFF serialiser
