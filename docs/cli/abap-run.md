---
title: abap run
sidebar_position: 19
description: Execute an ad-hoc ABAP snippet via a temporary class.
---

# `adt abap run`

Execute ABAP code from a file or stdin by creating a temporary class with an
`IF_OO_ADT_CLASSRUN` `main( )` method, running it, capturing stdout, and
deleting the temp class.

Ideal for scripting quick diagnostics (`WRITE sy-uname.`, `SELECT COUNT(*) FROM
…`, etc.) without creating a permanent repository object.

## Arguments

| Argument | Description                                         |
| -------- | --------------------------------------------------- |
| `[file]` | Source file path (use `-` for stdin). Default: `-`. |

## Options

| Flag                   | Description                                         |
| ---------------------- | --------------------------------------------------- |
| `--prefix <name>`      | Temp class name prefix (default: `zcl_adtcli_run`). |
| `--package <pkg>`      | Package for the temp class (default: `$TMP`).       |
| `--transport <corrnr>` | Transport request (not needed for `$TMP`).          |

## Examples

```bash
# From a file
cat > hello.abap <<'ABAP'
WRITE sy-uname.
ABAP
adt abap run hello.abap
# PPLENKOV

# From stdin
echo 'DATA(n) = sy-datum. WRITE n.' | adt abap run

# Into a transportable package
adt abap run diag.abap --package ZADHOC --transport DEVK900001
```

## See also

- [`datapreview`](./datapreview) — pure `SELECT` path (no ABAP runtime)
- [`rfc`](./rfc) — call an existing RFC function module
- `@abapify/adk` — `AdkClass` used for the temp class scaffold
