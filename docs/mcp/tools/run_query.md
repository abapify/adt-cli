---
title: run_query
sidebar_label: run_query
description: "Execute a freestyle ABAP SQL SELECT query and return results as JSON. Only SELECT statements are supported."
---

# `run_query`

Execute a freestyle ABAP SQL SELECT query and return results as JSON. Only SELECT statements are supported.

Defined in [`packages/adt-mcp/src/lib/tools/run-query.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/run-query.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  query: string; // ABAP SQL SELECT statement (e.g. "SELECT * FROM T001 WHERE MANDT = \'100\'")
  maxRows?: number; // Maximum rows to return (default: 100)
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
  "name": "run_query",
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

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
