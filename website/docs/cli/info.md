---
title: info
sidebar_position: 24
description: SAP system and session information.
---

# `adt info`

Get SAP system and session information — product version, system ID, client,
language, current user, cookies / CSRF state.

## Options

| Flag                  | Description                                         |
| --------------------- | --------------------------------------------------- |
| `--session`           | Get session information.                            |
| `--system`            | Get system information.                             |
| `-o, --output <file>` | Save data to file (JSON or XML based on extension). |

When neither `--session` nor `--system` is supplied, both are shown.

## Examples

```bash
# Everything
adt info

# Session only
adt info --session

# System info to a file
adt info --system -o system.json
```

## See also

- [`auth`](./auth) — which session is active
- [`discovery`](./discovery) — list of ADT services available on the system
- MCP tool [`system_info`](/mcp/tools/system_info)
