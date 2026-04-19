---
title: cts_create_transport
sidebar_label: cts_create_transport
description: "Create a new transport request"
---

# `cts_create_transport`

Create a new transport request

Defined in [`packages/adt-mcp/src/lib/tools/cts-create-transport.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/cts-create-transport.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  description: string; // Transport description
  type?: 'K' | 'W'; // Transport type: K (Workbench) or W (Customizing). Default: K
  target?: string; // Target system
  project?: string; // CTS project name
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
  "name": "cts_create_transport",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "description": "<description>"
  }
}
```

## Underlying contract

- `client.adt.cts.transportrequests.create`

## See also

- [MCP overview](../overview.md)
