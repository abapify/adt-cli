---
title: Business Services (RAP SRVB)
description: RAP service bindings.
---

# `client.adt.businessservices`

RAP service binding management.

## Sub-namespaces

### `client.adt.businessservices.bindings`

CRUD for `/sap/bc/adt/businessservices/bindings/...`, plus:

| Method | HTTP | Path | Summary |
|--------|------|------|---------|
| `.publishedstates.post(name)` | POST | `.../bindings/{name}/publishedstates` | Publish |
| `.publishedstates.delete(name)` | DELETE | `.../bindings/{name}/publishedstates` | Unpublish |

## Schema

Source: [`adt-contracts/src/adt/businessservices/`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/src/adt/businessservices)
Response type: `ServiceBindingResponse`.
