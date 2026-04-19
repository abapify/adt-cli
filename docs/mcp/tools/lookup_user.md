---
title: lookup_user
sidebar_label: lookup_user
description: "Look up SAP system users. Empty query returns the current user; exact username returns a single user; wildcard query (with * or ?) searches."
---

# `lookup_user`

Look up SAP system users. Empty query returns the current user; exact username returns a single user; wildcard query (with * or ?) searches.

Defined in [`packages/adt-mcp/src/lib/tools/lookup-user.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/lookup-user.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  query?: string; // Username (exact) or wildcard search (e.g. DEV*). Empty returns the current user.
  maxResults?: number; // Max results for wildcard searches (default: 50).
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
  "name": "lookup_user",
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
