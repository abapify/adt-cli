---
title: delete_object
sidebar_label: delete_object
description: 'Delete an ABAP object. Supports PROG, INCL, CLAS, INTF, FUGR, DEVC, DOMA, DTEL, TABL, STRUCT, DDLS, DCLS, BDEF, SRVD, SRVB and falls back to direct URI deletion for other types.'
---

# `delete_object`

Delete an ABAP object. Supports PROG, INCL, CLAS, INTF, FUGR, DEVC, DOMA, DTEL, TABL, STRUCT, DDLS, DCLS, BDEF, SRVD, SRVB and falls back to direct URI deletion for other types.

Defined in [`packages/adt-mcp/src/lib/tools/delete-object.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/delete-object.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  objectName: string; // Name of the ABAP object to delete
  objectType?: string; // Object type (e.g. CLAS, PROG, INTF, FUGR, DEVC)
  transport?: string; // Transport request number (required for transportable objects)
}
```

## Output

The tool returns a single text content item whose body is a JSON-serialised object (`content[0].text`). On error, the response has `isError: true` and a human-readable message.

```json
{
  "content": [{ "type": "text", "text": "<JSON.stringify(result, null, 2)>" }]
}
```

See the source for the exact shape of `result`.

## Example invocation

```json
{
  "name": "delete_object",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "objectName": "<objectName>"
  }
}
```

## Underlying contract

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
