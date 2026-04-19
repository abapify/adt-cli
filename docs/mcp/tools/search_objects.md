---
title: search_objects
sidebar_label: search_objects
description: "Search for ABAP objects in the repository (supports wildcards)"
---

# `search_objects`

Search for ABAP objects in the repository (supports wildcards)

Defined in [`packages/adt-mcp/src/lib/tools/search-objects.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/search-objects.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  query: string; // Search query (supports wildcards like *)
  maxResults?: number; // Maximum number of results (default: 50)
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
  "name": "search_objects",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "query": "<query>"
  }
}
```

## Underlying contract

- `client.adt.repository.informationsystem.search.quickSearch`

## See also

- [MCP overview](../overview.md)
