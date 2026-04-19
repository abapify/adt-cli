---
title: source
sidebar_position: 14
description: Generic ABAP source get/put for any object URI.
---

# `adt source`

Read (`get`) or write (`put`) the main ABAP source of an object by name. This
is the generic, type-agnostic counterpart to `adt class write`, `adt program
read`, etc. — it resolves the object type automatically.

## Subcommands

```
adt source get <objectName> [--type <type>] [--json]
adt source put <objectName> <file> [--type <type>] [--transport <tr>] [--json]
```

## Options

### `get`

| Argument / Flag | Description                                     |
| --------------- | ----------------------------------------------- |
| `<objectName>`  | ABAP object name.                               |
| `--type <type>` | Object type hint (e.g. `CLAS`, `PROG`, `INTF`). |
| `--json`        | Output result as JSON.                          |

### `put`

| Argument / Flag           | Description                                         |
| ------------------------- | --------------------------------------------------- |
| `<objectName>`            | ABAP object name.                                   |
| `<file>`                  | Path to the source file to upload.                  |
| `--type <type>`           | Object type hint (e.g. `CLAS`, `PROG`, `INTF`).     |
| `--transport <transport>` | Transport request number for transportable objects. |
| `--json`                  | Output result as JSON.                              |

## Examples

```bash
# Read any object's source to stdout
adt source get ZCL_DEMO > zcl_demo.abap
adt source get ZDEMO_PROG --type PROG

# Update source in-place
adt source put ZCL_DEMO zcl_demo.abap --transport DEVK900001

# Machine-readable response
adt source put ZCL_DEMO zcl_demo.abap --transport DEVK900001 --json
```

## See also

- [`objects`](./objects) — typed CRUD (`adt class write`, ...)
- [`lock`](./lock) — `put` handles locking implicitly; use `adt lock` for
  batch scenarios
