---
title: get_badi
sidebar_label: get_badi
description: 'Fetch Enhancement Implementation (ENHO/XHH — BAdI container) metadata, optionally including the source payload with its BAdI implementations.'
---

# `get_badi`

Fetch Enhancement Implementation (ENHO/XHH — BAdI container) metadata, optionally including the source payload with its BAdI implementations.

Defined in [`packages/adt-mcp/src/lib/tools/get-badi.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/get-badi.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  badiName: string; // Enhancement Implementation name (e.g. ZE_MY_BADI_IMPL)
  includeSource?: boolean; // Include source text listing the BAdI implementations
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
  "name": "get_badi",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "badiName": "<badiName>"
  }
}
```

## Underlying contract

- `client.adt.enhancements.enhoxhh.get`
- `client.adt.enhancements.enhoxhh.source.main.get`

## See also

- [MCP overview](../overview.md)
