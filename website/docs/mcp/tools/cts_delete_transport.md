---
title: cts_delete_transport
sidebar_label: cts_delete_transport
description: 'Delete a transport request'
---

# `cts_delete_transport`

Delete a transport request

Defined in [`packages/adt-mcp/src/lib/tools/cts-delete-transport.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/cts-delete-transport.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  transport: string; // Transport number to delete (e.g. S0DK900001)
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
  "name": "cts_delete_transport",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "transport": "<transport>"
  }
}
```

## Underlying contract

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
