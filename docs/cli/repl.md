---
title: repl
sidebar_position: 32
description: Interactive hypermedia navigator for ADT APIs.
---

# `adt repl`

Interactive hypermedia navigator for ADT APIs. Starts a REPL that performs
authenticated `GET` requests, parses the XML/JSON response, extracts
hyperlinks, and lets you "walk" from one resource to the next.

## Arguments

| Argument | Description |
| --- | --- |
| `[url]` | Optional starting URL path (defaults to `/sap/bc/adt/discovery`). |

## Commands (inside the REPL)

| Command | Description |
| --- | --- |
| `<n>` | Follow link number `n` from the last response. |
| `back` | Pop the previous URL from the navigation stack. |
| `get <path>` | Fetch an arbitrary path. |
| `raw` | Print the raw body of the last response. |
| `save <file>` | Save the last response to `<file>`. |
| `help` | Show REPL help. |
| `quit` / `exit` | Leave the REPL. |

## Examples

```bash
# Start at the discovery document
adt repl

# Start somewhere specific
adt repl /sap/bc/adt/repository/nodestructure
```

## See also

- [`fetch`](./fetch) — single-shot authenticated request
- [`discovery`](./discovery) — entry point used by default
