---
title: get_function
sidebar_label: get_function
description: 'Read ABAP function module metadata (parameters, exceptions) and optionally its source code.'
---

# `get_function`

Read ABAP function module metadata (parameters, exceptions) and optionally its source code.

Defined in [`packages/adt-mcp/src/lib/tools/function-tools.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/function-tools.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  groupName: string; // Function group name (e.g. ZFUGR_UTIL)
  functionName: string; // Function module name (e.g. Z_MY_FUNCTION)
  includeSource?: boolean; // Whether to also return the source code (default: false)
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
  "name": "get_function",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "groupName": "<groupName>",
    "functionName": "<functionName>"
  }
}
```

## Underlying contract

- `client.adt.functions.groups.fmodules.get`
- `client.adt.functions.groups.fmodules.source.main.get`

## See also

- [MCP overview](../overview.md)
