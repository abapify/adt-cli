---
title: get_table_contents
sidebar_label: get_table_contents
description: 'Read data from a DDIC table with optional WHERE filter, column selection, and row limit. WARNING: the WHERE clause is sent as-is to the SAP data preview endpoint — avoid untrusted input.'
---

# `get_table_contents`

Read data from a DDIC table with optional WHERE filter, column selection, and row limit. WARNING: the WHERE clause is sent as-is to the SAP data preview endpoint — avoid untrusted input.

Defined in [`packages/adt-mcp/src/lib/tools/get-table-contents.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/get-table-contents.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  tableName: string; // DDIC table name (e.g. MARA, VBAK, T001)
  where?: string; // WHERE clause (ABAP SQL syntax, e.g. "MATNR LIKE \'Z%\'")
  columns?: string[]; // Columns to select (default: all columns). Example: ["MATNR","MBRSH"]
  maxRows?: number; // Maximum rows to return (default: 100)
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
  "name": "get_table_contents",
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

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
