---
title: gcts_config
sidebar_label: gcts_config
description: 'Get, set, unset, or list gCTS repository configuration entries'
---

# `gcts_config`

Get, set, unset, or list gCTS repository configuration entries

Defined in [`packages/adt-mcp/src/lib/tools/gcts-tools.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/gcts-tools.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  rid: string; // Repository ID
  action: 'get' | 'set' | 'unset' | 'list'; // Operation to perform
  key?: string; // Config key (for get/set/unset)
  value?: string; // Config value (for set)
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
  "name": "gcts_config",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "rid": "<rid>",
    "action": "<action>"
  }
}
```

## Underlying contract

- `client.adt.gcts.repository.get`
- `client.adt.gcts.config.get`
- `client.adt.gcts.config.set`
- `client.adt.gcts.config.delete`

## See also

- [MCP overview](../overview.md)
