---
title: lock_object
sidebar_label: lock_object
description: "Acquire an ADT edit lock on an ABAP object and return the lock handle needed for subsequent write operations."
---

# `lock_object`

Acquire an ADT edit lock on an ABAP object and return the lock handle needed for subsequent write operations.

Defined in [`packages/adt-mcp/src/lib/tools/lock-object.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/lock-object.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  objectName: string; // ABAP object name
  objectType?: string; // Object type (e.g. CLAS, PROG, INTF, FUGR)
  transport?: string; // Transport request number
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
  "name": "lock_object",
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
