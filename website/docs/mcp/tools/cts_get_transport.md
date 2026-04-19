---
title: cts_get_transport
sidebar_label: cts_get_transport
description: 'Get details of a specific transport request'
---

# `cts_get_transport`

Get details of a specific transport request

Defined in [`packages/adt-mcp/src/lib/tools/cts-get-transport.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/cts-get-transport.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  transport: string; // Transport number (e.g. S0DK900001)
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
  "name": "cts_get_transport",
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
