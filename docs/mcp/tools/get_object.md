---
title: get_object
sidebar_label: get_object
description: "Get details about a specific ABAP object by name"
---

# `get_object`

Get details about a specific ABAP object by name

Defined in [`packages/adt-mcp/src/lib/tools/get-object.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/get-object.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  objectName: string; // ABAP object name to inspect
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
  "name": "get_object",
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

- `client.adt.repository.informationsystem.search.quickSearch`

## See also

- [MCP overview](../overview.md)
