---
title: RAP development — BDEF / SRVD / SRVB
sidebar_position: 5
description: Build a RAP service end-to-end — CDS root view, behavior definition, service definition, service binding.
---

# RAP development

## Goal

Take a CDS root view all the way to a published OData V4 service. The RAP
triplet is three objects that always travel together:

```
ZI_CUSTOMER         (root view — provides the structure)
 └── ZBP_I_CUSTOMER (BDEF — defines actions, fields, authorization)
 └── ZUI_CUSTOMER   (SRVD — exposes it as an external service)
      └── ZUI_CUSTOMER_O4 (SRVB — binds SRVD to a protocol/version: OData V4)
```

## Prerequisites

- [adt-cli installed and authenticated](/getting-started/installation)
- A CDS root view exists: see [CDS authoring](./cds-authoring) (`ZI_CUSTOMER`)
- A transport: `export TR=DEVK900001`

## Steps

### 1. Convert the view into a root view (draft)

Edit the DDL to declare it as a root:

```ddl
@AccessControl.authorizationCheck: #CHECK
@EndUserText.label: 'Customer (root)'
define root view entity ZI_CUSTOMER
  as select from zt_customer
{
  key customer_id as CustomerId,
      name        as Name
}
```

```bash
adt ddl write ZI_CUSTOMER zi_customer.ddls.asddls -t $TR --activate
```

### 2. Behavior Definition (BDEF)

```bash
adt bdef create ZBP_I_CUSTOMER "Behavior for ZI_CUSTOMER" ZMYPKG -t $TR

cat > zbp_i_customer.abdl <<'BDEF'
managed implementation in class zbp_i_customer unique;
strict ( 2 );

define behavior for ZI_CUSTOMER alias Customer
persistent table zt_customer
lock master
authorization master ( instance )
{
  field ( readonly, numbering : managed ) CustomerId;
  field ( mandatory ) Name;

  create;
  update;
  delete;
}
BDEF

adt bdef write ZBP_I_CUSTOMER zbp_i_customer.abdl -t $TR --activate
```

### 3. Behavior implementation class (optional for managed)

A managed BDEF auto-generates handler shells for validation / determination
if you don't provide `zbp_i_customer`. Create one only if you need custom
logic — see [Object lifecycle](./object-lifecycle) for `adt class create`.

### 4. Service Definition (SRVD)

```bash
adt srvd create ZUI_CUSTOMER "Customer UI service" ZMYPKG -t $TR

cat > zui_customer.srvd.asrvd <<'SRVD'
@EndUserText.label: 'Customer UI service'
define service ZUI_CUSTOMER {
  expose ZI_CUSTOMER as Customer;
}
SRVD

adt srvd write ZUI_CUSTOMER zui_customer.srvd.asrvd -t $TR --activate
```

### 5. Service Binding (SRVB) + publish

```bash
adt srvb create ZUI_CUSTOMER_O4 "OData V4 binding" ZMYPKG -t $TR
```

Bindings carry protocol + version metadata that isn't source — edit via
checkout:

```bash
adt checkout srvb ZUI_CUSTOMER_O4 ./src
$EDITOR ./src/zui_customer_o4.srvb.xml    # set <SERVICE_DEFINITION>ZUI_CUSTOMER</>, <BINDING_TYPE>ODATA</>, <BINDING_VERSION>V4</>
adt checkin ./src -p ZMYPKG -t $TR
```

Publish (≠ activate — publishing exposes the service on Gateway):

```bash
adt srvb publish ZUI_CUSTOMER_O4
```

Expected output:

```
Publishing ZUI_CUSTOMER_O4 ... published
  Service URL: /sap/opu/odata4/sap/zui_customer_o4/srvd_f4/sap/zui_customer/0001/
```

### 6. Smoke-test

```bash
adt fetch /sap/opu/odata4/sap/zui_customer_o4/srvd_f4/sap/zui_customer/0001/\$metadata
```

## Troubleshooting

| Error                                                   | Cause                                                 | Fix                                                                                      |
| ------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `RAP-020: Managed behaviour requires root view`         | View is not a root view                               | Add `root` keyword in DDL and reactivate                                                 |
| `RAP-124: Field Name not mandatory on persistent table` | `mandatory` on a field declared optional on the table | Either allow the table field to be `NOT NULL` or remove `mandatory`                      |
| `Service binding activation failed: SRVD is inactive`   | SRVD wasn't activated before SRVB                     | Activate in order: DDL → BDEF → SRVD → SRVB                                              |
| `Gateway publish: /IWFND/MED_COCKPIT error`             | Embedded Gateway not configured                       | Ask basis team to enable `/IWFND/MAINT_SERVICE` / run SICF activation for the OData node |
| `Cannot unpublish binding — consumers active`           | Running apps use the service                          | Use `adt srvb unpublish ZUI_CUSTOMER_O4` only during a window, or bump binding version   |

## See also

- [`adt bdef` / `srvd` / `srvb` reference](/cli/rap)
- [CDS authoring](./cds-authoring)
- [CTS workflow](./cts-workflow)
- [MCP `create_bdef` / `create_srvd` / `create_srvb`](/mcp/tools/create_bdef)
