---
title: get_structure
sidebar_label: get_structure
description: 'Fetch DDIC structure metadata, optionally including the ABAP source.'
---

# `get_structure`

Fetch DDIC structure metadata, optionally including the ABAP source.

Defined in [`packages/adt-mcp/src/lib/tools/get-structure.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/get-structure.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  structureName: string; // Structure name (e.g. ZSTRUCT_SAMPLE)
  includeSource?: boolean; // Include ABAP source definition
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
  "name": "get_structure",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "structureName": "<structureName>"
  }
}
```

## Underlying contract

- `client.adt.ddic.structures.get`
- `client.adt.ddic.structures.source.main.get`

## See also

- [MCP overview](../overview.md)
