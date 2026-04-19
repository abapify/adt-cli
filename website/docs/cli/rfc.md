---
title: rfc
sidebar_position: 31
description: Invoke classic RFC function modules via SOAP-over-HTTP.
---

# `adt rfc`

Invoke a classic RFC function module via SOAP-over-HTTP (`/sap/bc/soap/rfc`).

## Arguments

| Argument | Description                                                          |
| -------- | -------------------------------------------------------------------- |
| `<fm>`   | RFC function module name (case-insensitive, e.g. `STFC_CONNECTION`). |

## Options

| Flag                          | Description                                                            |
| ----------------------------- | ---------------------------------------------------------------------- |
| `-p, --param <key=value>`     | Pass an importing/changing parameter. Repeatable.                      |
| `-j, --json <json>`           | Additional parameters as a JSON object (merged with `--param` values). |
| `-x, --exception-mode <mode>` | How to handle SOAP faults: `raw` \| `bapi` (default: `raw`).           |
| `-o, --output <file>`         | Write the JSON response to a file.                                     |
| `--client <sap-client>`       | Override `sap-client` query parameter.                                 |
| `--pretty`                    | Pretty-print JSON output (default: `true`).                            |

## Examples

```bash
# Simplest possible RFC — returns system info
adt rfc STFC_CONNECTION -p REQUTEXT=ping

# Complex payload via --json
adt rfc BAPI_USER_GETLIST \
    --json '{"MAX_ROWS":10,"WITH_USERNAME":"PPL*"}' \
    -o users.json

# BAPI exception-mode: RETURN tables with TYPE='E' raise an error
adt rfc BAPI_USER_EXISTENCE_CHECK -p USERNAME=PPLENKOV -x bapi

# Client override (useful when routing differs per mandant)
adt rfc RFC_PING --client 100
```

## See also

- [`datapreview`](./datapreview) — for pure `SELECT` workloads
- [`abap run`](./abap-run) — execute an ABAP snippet instead of an RFC
- MCP tool [`call_rfc`](/mcp/tools/call_rfc)
