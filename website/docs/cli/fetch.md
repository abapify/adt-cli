---
title: fetch
sidebar_position: 26
description: Authenticated HTTP request — like `curl` but with the SAP session.
---

# `adt fetch`

Fetch a URL with authentication (like `curl` but authenticated). Goes through
the same `AdtClient` pipeline as typed commands, so CSRF tokens, cookies and
security sessions are attached transparently.

## Arguments

| Argument | Description                                                |
| -------- | ---------------------------------------------------------- |
| `<url>`  | URL path to fetch (e.g. `/sap/bc/adt/core/http/sessions`). |

## Options

| Flag                    | Description                                                |
| ----------------------- | ---------------------------------------------------------- |
| `-X, --method <method>` | HTTP method (default: `GET`).                              |
| `-H, --header <header>` | Add header (can be used multiple times).                   |
| `-d, --data <data>`     | Request body (for `POST`/`PUT`).                           |
| `-o, --output <file>`   | Save response to file.                                     |
| `--accept <type>`       | Set `Accept` header (shorthand for `-H "Accept: <type>"`). |

## Examples

```bash
# GET the discovery document as XML
adt fetch /sap/bc/adt/discovery --accept application/atomsvc+xml

# POST a lock request (advanced)
adt fetch '/sap/bc/adt/oo/classes/zcl_demo?_action=LOCK&accessMode=MODIFY' \
    -X POST \
    -H 'X-sap-adt-sessiontype: stateful' \
    -H 'Accept: application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.Result'

# Save a raw response to disk
adt fetch /sap/bc/adt/repository/nodestructure -o nodestructure.xml
```

## See also

- [`repl`](./repl) — interactive navigator (uses `fetch` under the hood)
- [`discovery`](./discovery) — find URLs to fetch
