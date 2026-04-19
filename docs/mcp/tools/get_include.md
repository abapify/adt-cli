---
title: get_include
sidebar_label: get_include
description: 'Fetch metadata for an ABAP program include (PROG/I).'
---

# `get_include`

Fetch metadata for an ABAP program include (PROG/I).

Defined in [`packages/adt-mcp/src/lib/tools/get-include.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/get-include.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  includeName: string; // Include name (e.g. ZTEST_INCLUDE). Case-insensitive.
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
  "name": "get_include",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "includeName": "<includeName>"
  }
}
```

## Underlying contract

- `client.adt.programs.includes.get`

## See also

- [MCP overview](../overview.md)
