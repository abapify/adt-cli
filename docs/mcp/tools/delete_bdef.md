---
title: delete_bdef
sidebar_label: delete_bdef
description: "Delete a RAP Behavior Definition (BDEF) object."
---

# `delete_bdef`

Delete a RAP Behavior Definition (BDEF) object.

Defined in [`packages/adt-mcp/src/lib/tools/delete-bdef.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/delete-bdef.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  bdefName: string; // BDEF name
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
  "name": "delete_bdef",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "bdefName": "<bdefName>"
  }
}
```

## Underlying contract

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
