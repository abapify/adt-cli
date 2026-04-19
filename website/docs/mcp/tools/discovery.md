---
title: discovery
sidebar_label: discovery
description: 'Discover available ADT services on a SAP system'
---

# `discovery`

Discover available ADT services on a SAP system

Defined in [`packages/adt-mcp/src/lib/tools/discovery.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/discovery.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  filter?: string; // Filter workspaces by title substring
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
  "name": "discovery",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100"
  }
}
```

## Underlying contract

- `client.adt.discovery.getDiscovery`

## See also

- [MCP overview](../overview.md)
