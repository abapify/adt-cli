---
title: create_object
sidebar_label: create_object
description: "Create a new ABAP object. Supported types: PROG, CLAS, INTF, FUGR, DEVC, DOMA (domain), DTEL (data element), TABL (table), STRUCT (structure), DDLS (CDS DDL), DCLS (CDS DCL), BDEF (RAP behavior definition), SRVD (RAP service definition)."
---

# `create_object`

Create a new ABAP object. Supported types: PROG, CLAS, INTF, FUGR, DEVC, DOMA (domain), DTEL (data element), TABL (table), STRUCT (structure), DDLS (CDS DDL), DCLS (CDS DCL), BDEF (RAP behavior definition), SRVD (RAP service definition).

Defined in [`packages/adt-mcp/src/lib/tools/create-object.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/create-object.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  objectName: string; // Name of the new object (uppercase, e.g. ZCL_MY_CLASS, ZPACKAGE)
  objectType: string; // Object type: PROG, CLAS, INTF, FUGR, DEVC, DOMA, DTEL, TABL, STRUCT, DDLS, DCLS, BDEF, SRVD
  description: string; // Short description of the object
  packageName?: string; // Package to assign the object to (required for non-local objects)
  transport?: string; // Transport request number (required for transportable objects)
}
```

## Output

The tool returns a single text content item whose body is a JSON-serialised object (`content[0].text`). On error, the response has `isError: true` and a human-readable message.

```json
{
  "content": [
    { "type": "text", "text": "<JSON.stringify(result, null, 2)>" }
  ]
}
```

See the source for the exact shape of `result`.

## Example invocation

```json
{
  "name": "create_object",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "objectName": "<objectName>",
      "objectType": "<objectType>",
      "description": "<description>"
  }
}
```

## Underlying contract

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
