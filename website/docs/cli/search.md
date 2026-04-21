---
title: search
sidebar_position: 21
description: Quick object search.
---

# `adt search`

Search for ABAP objects in the repository. Wraps the ADT "quick search" API
(`/sap/bc/adt/repository/informationsystem/search`).

## Arguments

| Argument  | Description                                 |
| --------- | ------------------------------------------- |
| `<query>` | Search query (supports wildcards like `*`). |

## Options

| Flag                 | Description                                |
| -------------------- | ------------------------------------------ |
| `-m, --max <number>` | Maximum number of results (default: `50`). |
| `--json`             | Output results as JSON.                    |

## Examples

```bash
# Simple lookup
adt search ZCL_DEMO

# Wildcard
adt search 'ZCL_DEMO*' -m 20 --json

# Pipe into another tool
adt search 'ZCL_DEMO*' --json | jq -r '.[].name'
```

## See also

- [`get`](./get) — resolve an exact name to object metadata
- [`ls`](./ls) — list objects of a known package
- MCP tools [`search_objects`](/mcp/tools/search_objects), [`grep_objects`](/mcp/tools/grep_objects)
