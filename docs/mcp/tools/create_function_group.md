---
title: create_function_group
sidebar_label: create_function_group
description: "Create a new ABAP function group. Wraps the typed functions/groups contract."
---

# `create_function_group`

Create a new ABAP function group. Wraps the typed functions/groups contract.

Defined in [`packages/adt-mcp/src/lib/tools/create-function-group.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/create-function-group.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  groupName: string; // Function group name (uppercase, e.g. ZFG_UTIL)
  description: string; // Short description of the group
  packageName: string; // Package to assign the function group to
  transport?: string; // Transport request number (for transportable objects)
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
  "name": "create_function_group",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "groupName": "<groupName>",
      "description": "<description>",
      "packageName": "<packageName>"
  }
}
```

## Underlying contract

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
