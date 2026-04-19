---
title: cts_search_transports
sidebar_label: cts_search_transports
description: "Search transport requests via /sap/bc/adt/cts/transports?_action=FIND. Filters: user (owner), trfunction (K/W/T/*), status (D/R/L/... client-side filter)."
---

# `cts_search_transports`

Search transport requests via /sap/bc/adt/cts/transports?_action=FIND. Filters: user (owner), trfunction (K/W/T/*), status (D/R/L/... client-side filter).

Defined in [`packages/adt-mcp/src/lib/tools/cts-search-transports.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/cts-search-transports.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  user?: string; // Owner filter – username or * for all (default: *)
  trfunction?: string; // Transport function filter – K=workbench, W=customizing, T=copies, * for all (default: *)
  status?: string; // Optional client-side filter on TRSTATUS (e.g. D=Modifiable, R=Released)
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
  "name": "cts_search_transports",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100"
  }
}
```

## Underlying contract

- `client.adt.cts.transports.find`

## See also

- [MCP overview](../overview.md)
