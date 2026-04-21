---
title: create_function_module
sidebar_label: create_function_module
description: 'Create a new ABAP function module in a function group. Wraps the typed fmodules contract.'
---

# `create_function_module`

Create a new ABAP function module in a function group. Wraps the typed fmodules contract.

Defined in [`packages/adt-mcp/src/lib/tools/create-function-module.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/create-function-module.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  groupName: string; // Parent function group name (e.g. ZFG_UTIL)
  functionName: string; // Function module name (e.g. Z_MY_FM)
  description: string; // Short description
  processingType?: 'normal' | 'rfc' | 'update' | 'backgroundTask'; // Processing type (default: normal)
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
  "name": "create_function_module",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "groupName": "<groupName>",
    "functionName": "<functionName>",
    "description": "<description>"
  }
}
```

## Underlying contract

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
