---
title: get_callers_of
sidebar_label: get_callers_of
description: "Find all callers (upward call hierarchy) of an ABAP method, function module, or subroutine"
---

# `get_callers_of`

Find all callers (upward call hierarchy) of an ABAP method, function module, or subroutine.

Defined in [`packages/adt-mcp/src/lib/tools/call-hierarchy.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/call-hierarchy.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  objectName: string;       // Name of the ABAP object (class, function group, program)
  objectType?: string;      // Object type (e.g. CLAS, FUGR, PROG)
  objectUri?: string;       // Direct ADT URI of the object (skips name resolution if provided)
  maxResults?: number;      // Maximum number of results (default: 50)
}
```

## Output

JSON object with shape `{ objectName, objectUri, callers }`. Returned inside `content[0].text`.

## Example invocation

```json
{
  "name": "get_callers_of",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "objectName": "ZCL_MY_CLASS",
    "objectType": "CLAS"
  }
}
```

## Underlying contract

- `GET /sap/bc/adt/repository/informationsystem/callers` (via `client.fetch`)

## See also

- [`get_callees_of`](get_callees_of.md)
- [MCP overview](../overview.md)
