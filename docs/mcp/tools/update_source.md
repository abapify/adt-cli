---
title: update_source
sidebar_label: update_source
description: "Write new ABAP source code to an existing object (acquires lock, PUTs source, releases lock)"
---

# `update_source`

Write new ABAP source code to an existing object (acquires lock, PUTs source, releases lock)

Defined in [`packages/adt-mcp/src/lib/tools/update-source.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/update-source.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  objectName: string; // ABAP object name
  objectType?: string; // Object type (e.g. PROG, CLAS, INTF)
  sourceCode: string; // New ABAP source code
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
  "name": "update_source",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "objectName": "<objectName>",
      "sourceCode": "<sourceCode>"
  }
}
```

## Underlying contract

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
