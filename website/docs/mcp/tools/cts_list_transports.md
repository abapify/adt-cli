---
title: cts_list_transports
sidebar_label: cts_list_transports
description: 'List transport requests from the CTS'
---

# `cts_list_transports`

List transport requests from the CTS

Defined in [`packages/adt-mcp/src/lib/tools/cts-list-transports.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/cts-list-transports.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  maxResults?: number; // Maximum number of results (default: 50)
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
  "name": "cts_list_transports",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100"
  }
}
```

## Underlying contract

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
