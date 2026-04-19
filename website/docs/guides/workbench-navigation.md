---
title: Workbench navigation
sidebar_position: 10
description: Where-used, callers, callees, definition, and outline from the CLI.
---

# Workbench navigation

## Goal

Answer the questions you'd normally ask in SE80 / Eclipse ADT workbench —
"who calls this?", "what does this call?", "where is it used?", "what does
its structure look like?" — from the CLI, so you can pipe results into
scripts or AI agents.

## Prerequisites

- [adt-cli installed and authenticated](/getting-started/installation)

## Steps

### 1. Resolve a name to a definition

```bash
adt wb definition CL_SALV_TABLE
```

Expected output:

```
CLAS  CL_SALV_TABLE
  URI:     /sap/bc/adt/oo/classes/cl_salv_table
  Package: SALV
```

With type hint (faster, avoids name collisions across object types):

```bash
adt wb definition CL_SALV_TABLE -t CLAS --json
```

### 2. Where-used

```bash
adt wb where-used ZCL_CUSTOMER -m 100 --json > usages.json
jq '.[] | "\(.type)/\(.name)"' usages.json
```

Human-readable form:

```bash
adt wb where-used ZDTEL_CUSTOMER_ID
# →  TABL ZT_CUSTOMER  (field CUSTOMER_ID)
# →  TABL ZS_CUSTOMER  (field CUSTOMER_ID)
# →  CLAS ZCL_CUSTOMER (method get_by_id, param IV_ID)
```

### 3. Call hierarchy

```bash
adt wb callers ZCL_CUSTOMER -t CLAS      # who calls my class?
adt wb callees ZCL_CUSTOMER -t CLAS      # what does my class call?
```

Combine with `jq` to find external dependencies only:

```bash
adt wb callees ZCL_CUSTOMER -t CLAS --json \
  | jq '.[] | select(.name | startswith("Z")|not) | .name' \
  | sort -u
```

### 4. Outline

Structural view — includes, methods, attributes, types:

```bash
adt wb outline ZCL_CUSTOMER
```

Inspect an **inactive** version (work-in-progress before activation):

```bash
adt wb outline ZCL_CUSTOMER --version inactive
```

### 5. URI-mode (skip name resolution)

If you already have the ADT URI (e.g. from `adt ls` or `adt search`), pass it
directly — saves one round-trip:

```bash
adt wb outline --uri /sap/bc/adt/oo/classes/zcl_customer
adt wb where-used --uri /sap/bc/adt/ddic/tables/zt_customer
```

## Recipes

### Build a dependency graph

```bash
for c in $(adt ls \$ZDEMO --types CLAS --json | jq -r '.[].name'); do
  adt wb callees "$c" -t CLAS --json \
    | jq -r --arg src "$c" '.[] | "\($src) -> \(.name)"'
done > deps.txt
```

Pipe into Graphviz:

```bash
( echo 'digraph G {'; sed 's/$/;/' deps.txt; echo '}') | dot -Tsvg > deps.svg
```

### Impact analysis before a refactor

```bash
adt wb where-used ZCL_OLD_NAME --json \
  | jq -r '.[] | [.type, .name, .package] | @tsv'
```

Hand this list to your reviewer or feed it into an MCP-capable assistant
([`find_references`](/mcp/tools/find_references)).

## Troubleshooting

| Error                                    | Cause                                                 | Fix                                                          |
| ---------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| `Ambiguous name: resolved 3 definitions` | Same name exists as CLAS + INTF + ...                 | Pass `-t CLAS` (or the correct kind)                         |
| `No where-used data available`           | Where-used index not built on system                  | Run SE80 → Utilities → Where-used in Background (basis task) |
| Outline empty                            | Object is inactive and has no inactive version either | `adt <type> read <name>` first to confirm existence          |

## See also

- [`adt wb` reference](/cli/wb)
- [`adt search`](/cli/search) — fuzzy name search
- [`adt get`](/cli/get) — quick URI resolution
- [MCP `find_references`, `get_callers_of`, `get_callees_of`, `find_definition`](/mcp/tools/find_references)
