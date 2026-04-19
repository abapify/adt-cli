---
title: unlock_object
sidebar_label: unlock_object
description: "Release an ADT edit lock acquired with lock_object. Requires the lockHandle returned by lock_object."
---

# `unlock_object`

Release an ADT edit lock acquired with lock_object. Requires the lockHandle returned by lock_object.

Defined in [`packages/adt-mcp/src/lib/tools/unlock-object.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/unlock-object.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  objectName: string; // ABAP object name
  objectType?: string; // Object type (e.g. CLAS, PROG, INTF, FUGR)
  lockHandle: string; // Lock handle returned by lock_object
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
  "name": "unlock_object",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "objectName": "<objectName>",
      "lockHandle": "<lockHandle>"
  }
}
```

## Underlying contract

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
