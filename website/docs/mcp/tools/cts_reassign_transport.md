---
title: cts_reassign_transport
sidebar_label: cts_reassign_transport
description: 'Change the owner of a transport request (optionally cascading to modifiable tasks).'
---

# `cts_reassign_transport`

Change the owner of a transport request (optionally cascading to modifiable tasks).

Defined in [`packages/adt-mcp/src/lib/tools/cts-reassign-transport.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/cts-reassign-transport.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  transportNumber: string; // Transport number (e.g. S0DK900123)
  targetUser: string; // SAP username of the new owner
  recursive?: boolean; // Also reassign all modifiable tasks (default: false)
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
  "name": "cts_reassign_transport",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "transportNumber": "<transportNumber>",
    "targetUser": "<targetUser>"
  }
}
```

## Underlying contract

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
