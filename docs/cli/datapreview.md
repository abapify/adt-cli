---
title: datapreview
sidebar_position: 18
description: ABAP Open SQL preview (datapreview / freestyle).
---

# `adt datapreview`

ABAP data preview (Open SQL console) operations. Runs arbitrary `SELECT`
statements through the Eclipse ADT "Data Preview" / Freestyle endpoint.

## Subcommands

| Command                            | Description                                  |
| ---------------------------------- | -------------------------------------------- |
| `adt datapreview osql <statement>` | Execute an ABAP Open SQL `SELECT` statement. |

## Options — `osql`

| Argument / Flag         | Description                                        |
| ----------------------- | -------------------------------------------------- |
| `<statement>`           | ABAP SQL `SELECT` statement (quote it).            |
| `-o, --output <format>` | Output format: `human` (default) or `json`.        |
| `-r, --rows <n>`        | Maximum number of rows to return (default: `100`). |
| `--noheadings`          | Suppress column headings.                          |
| `--noaging`             | Disable SAP aging (bypass browser cache flag).     |

## Examples

```bash
# Simple select, default human table
adt datapreview osql 'SELECT * FROM t000 UP TO 5 ROWS'

# JSON output for further processing
adt datapreview osql 'SELECT mandt, mtext FROM t000' -o json -r 50

# Suppress headers for `cut`/`awk` piping
adt datapreview osql 'SELECT bname FROM usr01' --noheadings -r 1000
```

## See also

- MCP tools [`run_query`](/mcp/tools/run_query), [`get_table_contents`](/mcp/tools/get_table_contents)
- [`rfc`](./rfc) — invoke classic RFC function modules
- [`abap run`](./abap-run) — run an ABAP snippet
