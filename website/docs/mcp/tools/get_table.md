---
title: get_table
sidebar_label: get_table
description: 'Read DDIC table or structure definition (fields, keys, data elements)'
---

# `get_table`

Read DDIC table or structure definition (fields, keys, data elements)

Defined in [`packages/adt-mcp/src/lib/tools/get-table.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/get-table.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  tableName: string; // DDIC table or structure name (e.g. MARA, VBAK)
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
  "name": "get_table",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "tableName": "<tableName>"
  }
}
```

## Underlying contract

- `client.adt.ddic.tables.get`

## See also

- [MCP overview](../overview.md)
