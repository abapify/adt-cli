---
title: CDS authoring — DDL and DCL
sidebar_position: 4
description: Author CDS views and access controls from the CLI with activation and error handling.
---

# CDS authoring

## Goal

Author a CDS view (DDL source) and a matching access control (DCL source)
from the CLI, activate them, and recover from the most common activation
errors.

## Prerequisites

- [adt-cli installed and authenticated](/getting-started/installation)
- DDIC prerequisites modelled — see [DDIC modeling](./ddic-modeling) for a
  `ZT_CUSTOMER` table we can project.
- A transport: `export TR=DEVK900001`

## Steps

### 1. Create the DDL shell

```bash
adt ddl create ZI_CUSTOMER "Customer CDS view" ZMYPKG -t $TR
```

The object exists but holds an empty `DEFINE VIEW ENTITY`.

### 2. Write the source

```bash
cat > zi_customer.ddls.asddls <<'DDL'
@AccessControl.authorizationCheck: #CHECK
@EndUserText.label: 'Customer'
define view entity ZI_CUSTOMER
  as select from zt_customer
{
  key customer_id as CustomerId,
      name        as Name
}
DDL

adt ddl write ZI_CUSTOMER zi_customer.ddls.asddls -t $TR --activate
```

Expected output:

```
Wrote DDLS ZI_CUSTOMER (2.1 KB)
Activating ZI_CUSTOMER ... active
```

### 3. Add a DCL (access control)

```bash
adt dcl create ZI_CUSTOMER "Customer access" ZMYPKG -t $TR

cat > zi_customer.dcls.asdcls <<'DCL'
@EndUserText.label: 'Customer access'
@MappingRole: true
define role ZI_CUSTOMER {
  grant select on ZI_CUSTOMER
    where (CustomerId) = aspect pfcg_auth(Z_CUSTOMER, CUST_ID, ACTVT = '03');
}
DCL

adt dcl write ZI_CUSTOMER zi_customer.dcls.asdcls -t $TR --activate
```

### 4. Preview the data

```bash
adt datapreview osql 'SELECT * FROM zi_customer UP TO 10 ROWS'
```

### 5. Where-used

```bash
adt wb where-used ZI_CUSTOMER      # every consumer (BDEFs, other views, ...)
```

## Editing loop

```bash
adt ddl read ZI_CUSTOMER > zi_customer.ddls.asddls
$EDITOR zi_customer.ddls.asddls
adt ddl write ZI_CUSTOMER zi_customer.ddls.asddls -t $TR --activate
```

## Troubleshooting

| Error                                     | Cause                                                                | Fix                                                                                   |
| ----------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `CDS entity name does not match source`   | First token after `define view entity` differs from DDLS object name | Keep them in sync: object `ZI_CUSTOMER` → source `define view entity ZI_CUSTOMER`     |
| `Unknown column NAME in view ZI_CUSTOMER` | Column missing in underlying table/view                              | Add the field and activate `ZT_CUSTOMER` first (see [DDIC modeling](./ddic-modeling)) |
| `Syntax check failed: CDS_CHECK_063`      | DCL role name must match DDL view                                    | A DCL role that protects `ZI_CUSTOMER` must be named `ZI_CUSTOMER`                    |
| `PFCG_AUTH aspect not known`              | `@MappingRole: true` missing or authorisation object missing         | Add annotation, create auth object in SU21 (not supported via CLI yet)                |
| Long activation (> 30 s)                  | Big projection / missing indexes on source table                     | Confirm it's a modelling issue, not CLI issue — there's no timeout knob here          |

## See also

- [`adt ddl` / `adt dcl` reference](/cli/cds)
- [RAP development](./rap-development) — the next step up (BDEF / SRVD / SRVB)
- [DDIC modeling](./ddic-modeling)
- [`acds` parser](/sdk/packages/acds) — local DDL parsing without a server
- [MCP `get_cds_ddl` / `get_cds_dcl`](/mcp/tools/get_cds_ddl)
