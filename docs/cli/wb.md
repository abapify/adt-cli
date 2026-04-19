---
title: wb — workbench navigation
sidebar_position: 29
description: Workbench navigation — where-used, callers, callees, definition, outline.
---

# `adt wb`

Workbench navigation (where-used, call-hierarchy, definition, outline). Wraps
the ADT "workbench" APIs used by Eclipse's navigation and hierarchy views.

## Subcommands

| Command                         | Description                                                       |
| ------------------------------- | ----------------------------------------------------------------- |
| `adt wb where-used <object>`    | Find all usages of an ABAP object or symbol.                      |
| `adt wb callers <object>`       | Find callers of a routine / class / function.                     |
| `adt wb callees <object>`       | Find things a routine / class / function calls.                   |
| `adt wb definition <reference>` | Resolve a symbol / object name to its definition.                 |
| `adt wb outline <object>`       | Show the structural outline (includes, methods, attributes, ...). |

## Common options

All subcommands share these flags (`callers`, `callees`, `where-used`,
`outline`):

| Flag                | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `-t, --type <type>` | Object type (`CLAS`, `PROG`, `INTF`, `FUGR`, `TABL`, ...). |
| `--uri <uri>`       | Direct ADT URI (skips name resolution).                    |

### `where-used`

| Flag                 | Description                                 |
| -------------------- | ------------------------------------------- |
| `-m, --max <number>` | Maximum number of results (default: `100`). |
| `--json`             | Output results as JSON.                     |

### `callers` / `callees`

| Flag                 | Description                                |
| -------------------- | ------------------------------------------ |
| `-m, --max <number>` | Maximum number of results (default: `50`). |
| `--json`             | Output results as JSON.                    |

### `definition`

| Flag                | Description                                        |
| ------------------- | -------------------------------------------------- |
| `-t, --type <type>` | Object type (`CLAS`, `PROG`, `DTEL`, `TABL`, ...). |
| `--json`            | Output result as JSON.                             |

### `outline`

| Flag                | Description                                                            |
| ------------------- | ---------------------------------------------------------------------- |
| `-t, --type <type>` | Object type hint.                                                      |
| `--version <v>`     | Object version to inspect: `active` \| `inactive` (default: `active`). |
| `--json`            | Output as JSON (default pretty-prints JSON structure).                 |

## Examples

```bash
# Who uses ZCL_DEMO?
adt wb where-used ZCL_DEMO -m 50 --json

# Call hierarchy
adt wb callers  ZCL_DEMO -t CLAS
adt wb callees  ZCL_DEMO -t CLAS

# Resolve ambiguous name
adt wb definition CL_SALV_TABLE

# Show outline of an inactive version
adt wb outline ZCL_DEMO --version inactive
```

## See also

- [`get`](./get) — quick name → URI resolution
- [`search`](./search) — fuzzy / wildcard search
- MCP tools [`find_references`](/mcp/tools/find_references), [`get_object_structure`](/mcp/tools/get_object_structure)
