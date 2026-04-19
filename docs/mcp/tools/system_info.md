---
title: system_info
sidebar_label: system_info
description: "Get SAP system and/or session information"
---

# `system_info`

Get SAP system and/or session information

Defined in [`packages/adt-mcp/src/lib/tools/system-info.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/system-info.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  scope?: 'session' | 'system' | 'both'; // What to retrieve (default: both)
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
  "name": "system_info",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100"
  }
}
```

## Underlying contract

- `client.adt.core.http.sessions.getSession`
- `client.adt.core.http.systeminformation.getSystemInfo`

## See also

- [MCP overview](../overview.md)
