---
title: user
sidebar_position: 20
description: Look up SAP system users.
---

# `adt user`

Look up SAP system users. When called without arguments, prints information
about the currently authenticated user.

## Arguments

| Argument  | Description                                             |
| --------- | ------------------------------------------------------- |
| `[query]` | Username or search query (supports wildcards like `*`). |

## Options

| Flag                 | Description                                |
| -------------------- | ------------------------------------------ |
| `-m, --max <number>` | Maximum number of results (default: `50`). |
| `--json`             | Output results as JSON.                    |

## Examples

```bash
# Who am I
adt user

# Single lookup
adt user PPLENKOV

# Wildcard search, machine-readable
adt user 'PPL*' --json -m 10
```

## See also

- [`info`](./info) — system and session metadata
- MCP tool [`lookup_user`](/mcp/tools/lookup_user)
