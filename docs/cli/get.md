---
title: get
sidebar_position: 22
description: Get details about a specific ABAP object.
---

# `adt get`

Resolve an ABAP object by name and print its metadata (type, URI, package,
description, links).

`adt get package <name>` is a legacy alias for [`adt package get`](./package).

## Arguments

| Argument | Description |
| --- | --- |
| `<objectName>` | ABAP object name to inspect. |

## Options

| Flag | Description |
| --- | --- |
| `--json` | Output as JSON (default: `false`). |

## Examples

```bash
# Human-readable
adt get ZCL_DEMO
# 📦 CLAS ZCL_DEMO ($ZDEMO) — Demo class
#    URI : /sap/bc/adt/oo/classes/zcl_demo
#    Author: PPLENKOV  /  Changed: 2025-11-20T14:05:12Z
#    Links:
#      - source : /sap/bc/adt/oo/classes/zcl_demo/source/main
#      - lock   : /sap/bc/adt/oo/classes/zcl_demo?_action=LOCK

# Machine-readable
adt get ZCL_DEMO --json | jq '.type'
```

## See also

- [`search`](./search) — find objects by wildcard
- [`wb`](./wb) — deeper inspection (outline, where-used, ...)
