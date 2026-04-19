---
title: delete_function_module
sidebar_label: delete_function_module
description: 'Delete an ABAP function module. Requires both group name and module name.'
---

# `delete_function_module`

Delete an ABAP function module. Requires both group name and module name.

Defined in [`packages/adt-mcp/src/lib/tools/delete-function-module.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/delete-function-module.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  groupName: string; // Parent function group name (e.g. ZFG_UTIL)
  functionName: string; // Function module name to delete
  transport?: string; // Transport request number (for transportable objects)
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
  "name": "delete_function_module",
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

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
