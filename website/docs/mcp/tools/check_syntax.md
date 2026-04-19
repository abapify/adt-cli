---
title: check_syntax
sidebar_label: check_syntax
description: 'Run ABAP syntax check (checkruns) on an object and return structured messages'
---

# `check_syntax`

Run ABAP syntax check (checkruns) on an object and return structured messages

Defined in [`packages/adt-mcp/src/lib/tools/check-syntax.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/check-syntax.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  objectName: string; // ABAP object name to check
  objectType?: string; // Object type hint (e.g. CLAS, PROG). Speeds up URI resolution.
  version?: 'active' | 'inactive' | 'new'; // Version to check: active, inactive, or new (default: active)
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
  "name": "check_syntax",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "objectName": "<objectName>"
  }
}
```

## Underlying contract

- `client.adt.checkruns.checkObjects.post`

## See also

- [MCP overview](../overview.md)
