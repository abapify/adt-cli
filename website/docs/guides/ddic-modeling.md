---
title: DDIC modeling — a Customer entity end-to-end
sidebar_position: 3
description: Model a Customer entity with DDIC — domain → data element → table → structure.
---

# DDIC modeling

## Goal

Model a minimal **Customer** entity in the Data Dictionary: create a domain
for the ID, a data element that documents it, a transparent table that stores
customers, and a structure we can reuse in signatures. Each layer depends on
the previous, so activation order matters.

## Prerequisites

- [adt-cli installed and authenticated](/getting-started/installation)
- A package (`ZMYPKG`) and a workbench transport — see [CTS workflow](./cts-workflow).

```bash
export TR=DEVK900001
```

## The dependency chain

```
ZDOMA_CUSTOMER_ID     (domain — primitive type + value range)
       ↓
ZDTEL_CUSTOMER_ID     (data element — semantic name + label + F1 help)
       ↓
ZT_CUSTOMER           (table — persistent storage)
ZS_CUSTOMER           (structure — reusable in-memory shape)
```

## Steps

### 1. Domain — the primitive type

```bash
adt domain create ZDOMA_CUSTOMER_ID "Customer ID" ZMYPKG -t $TR
```

Domains are metadata-only in ADT — there is no `write` subcommand. Default
domain ships as `CHAR(10)`; to set length, type, conversion routine etc. you
edit the serialised XML and reapply via `checkin` (see
[abapGit roundtrip](./abapgit-checkout-checkin)):

```bash
adt checkout domain ZDOMA_CUSTOMER_ID ./src
$EDITOR ./src/zdoma_customer_id.doma.xml   # set <DATATYPE>NUMC</DATATYPE>, <LENG>10</LENG>
adt checkin ./src -p ZMYPKG -t $TR
```

Activate:

```bash
adt domain activate ZDOMA_CUSTOMER_ID
```

### 2. Data element — semantic layer

```bash
adt dataelement create ZDTEL_CUSTOMER_ID "Customer ID" ZMYPKG -t $TR
```

Again, edit-via-checkout to wire the data element to the domain and set
labels:

```xml
<!-- zdtel_customer_id.dtel.xml -->
<ROLLNAME>ZDTEL_CUSTOMER_ID</ROLLNAME>
<DOMNAME>ZDOMA_CUSTOMER_ID</DOMNAME>
<SCRTEXT_S>Cust.</SCRTEXT_S>
<SCRTEXT_M>Customer</SCRTEXT_M>
<SCRTEXT_L>Customer ID</SCRTEXT_L>
```

```bash
adt checkin ./src -p ZMYPKG -t $TR
adt dataelement activate ZDTEL_CUSTOMER_ID
```

### 3. Table — persistent storage

```bash
adt table create ZT_CUSTOMER "Customer master" ZMYPKG -t $TR
adt checkout table ZT_CUSTOMER ./src
```

Add fields to `./src/zt_customer.tabl.xml`:

```xml
<DD03P>
  <FIELDNAME>CLIENT</FIELDNAME>
  <KEYFLAG>X</KEYFLAG>
  <ROLLNAME>MANDT</ROLLNAME>
</DD03P>
<DD03P>
  <FIELDNAME>CUSTOMER_ID</FIELDNAME>
  <KEYFLAG>X</KEYFLAG>
  <ROLLNAME>ZDTEL_CUSTOMER_ID</ROLLNAME>
</DD03P>
<DD03P>
  <FIELDNAME>NAME</FIELDNAME>
  <ROLLNAME>NAME_TEXT</ROLLNAME>
</DD03P>
```

```bash
adt checkin ./src -p ZMYPKG -t $TR
adt table activate ZT_CUSTOMER
```

### 4. Structure — signature shape

```bash
adt structure create ZS_CUSTOMER "Customer DTO" ZMYPKG -t $TR
adt checkout structure ZS_CUSTOMER ./src
# edit ./src/zs_customer.tabl.xml to add fields using ZDTEL_CUSTOMER_ID
adt checkin ./src -p ZMYPKG -t $TR
adt structure activate ZS_CUSTOMER
```

### 5. Verify

```bash
adt table read ZT_CUSTOMER --json | jq '.fields[].name'
adt wb where-used ZDTEL_CUSTOMER_ID    # should list ZT_CUSTOMER, ZS_CUSTOMER
```

Preview data (empty table at this point, but the path works):

```bash
adt datapreview osql 'SELECT * FROM zt_customer UP TO 5 ROWS'
```

## Troubleshooting

| Error                                              | Cause                                            | Fix                                                                                                                                       |
| -------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `DD4: Data element ZDTEL_CUSTOMER_ID is inactive`  | Activated table before data element              | Activate in order (domain → dtel → table), or activate all together: `adt table activate ZT_CUSTOMER ZDTEL_CUSTOMER_ID ZDOMA_CUSTOMER_ID` |
| `Database table adjustment required` on activation | Field layout changed after first activation      | In GUI this is SE14; there's no CLI equivalent yet — do a drop-and-recreate on dev systems or use SE14                                    |
| `TABL ZS_CUSTOMER does not exist` after create     | Structures use the same TABL URI space as tables | That's expected — `adt structure ...` uses the same backend endpoints as `adt table ...`                                                  |

## See also

- [`adt domain / dataelement / table / structure` reference](/cli/ddic)
- [abapGit checkout/checkin](./abapgit-checkout-checkin)
- [CDS authoring](./cds-authoring) — the next layer up
- [MCP `get_domain`, `get_data_element`](/mcp/tools/get_domain)
