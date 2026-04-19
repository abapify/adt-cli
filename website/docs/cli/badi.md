---
title: badi
sidebar_position: 9
description: BAdI / Enhancement Implementation (ENHO/XHH) CRUD.
---

# `adt badi`

BAdI / Enhancement Implementation CRUD. Enhancement Implementations are the
RAP-era containers for BAdI implementations, served under
`/sap/bc/adt/enhancements/enhoxhh`.

Standard source CRUD (see [`objects`](./objects)); options are identical to
those of `class` / `program` / ...:

## Subcommands

| Command                                          | Description                                       |
| ------------------------------------------------ | ------------------------------------------------- |
| `adt badi create <name> <description> <package>` | Create a BAdI / enhancement implementation.       |
| `adt badi read <name>`                           | Print the enhancement source.                     |
| `adt badi write <name> [file\|-]`                | Write new source (with optional activate).        |
| `adt badi activate <names...>`                   | Activate one or more enhancement implementations. |
| `adt badi delete <name>`                         | Delete an enhancement implementation.             |

## Options

Same as [`objects`](./objects):

- `create`: `-t, --transport <corrnr>`, `--no-error-existing`, `--json`
- `read`: `--json`
- `write`: `[file]`, `-t, --transport`, `--activate`
- `activate`: `--json`
- `delete`: `-t, --transport`, `-y, --yes`, `--json`

## Examples

```bash
# Create and push an enhancement implementation
adt badi create ZE_MY_BADI_IMPL "My BAdI impl" ZMYPKG -t DEVK900001
adt badi write  ZE_MY_BADI_IMPL impl.abap --activate

# Read back
adt badi read ZE_MY_BADI_IMPL > impl.abap

# Delete
adt badi delete ZE_MY_BADI_IMPL -t DEVK900001 -y
```

## See also

- [`objects`](./objects) — shared CRUD surface
- `@abapify/adk` — `AdkBadi`
