---
title: ls
sidebar_position: 23
description: List ABAP objects in the repository.
---

# `adt ls`

List ABAP objects in the repository (format-aware: abapGit, AFF/gCTS). By
default, scans the current directory for serialised objects; with `--dir`, the
scan root can be changed. When no directory is supplied, `ls` falls back to a
live SAP listing.

## Options

| Flag | Description |
| --- | --- |
| `--json` | Output as JSON. |
| `-t, --type <types>` | Filter by object type (comma-separated, e.g. `CLAS,INTF`). |
| `-o, --output <file>` | Write output to file. |
| `-d, --dir <directory>` | Directory to scan (default: current directory). |

## Examples

```bash
# List the current checkout
adt ls

# Only classes and interfaces in a sibling repo
adt ls -d ../another-repo -t CLAS,INTF

# JSON, filter and save
adt ls -t DDLS,DCLS --json -o cds-objects.json
```

## See also

- [`checkout`](./checkout) / [`import`](./import) — produce the
  directory structure that `ls` reads
- [`search`](./search) — search SAP directly
