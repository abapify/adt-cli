---
title: get_function_group
sidebar_label: get_function_group
description: "Read ABAP function group metadata (description, includes). Optionally includes source code."
---

# `get_function_group`

Read ABAP function group metadata (description, includes). Optionally includes source code.

Defined in [`packages/adt-mcp/src/lib/tools/function-tools.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/function-tools.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  groupName: string; // Function group name (e.g. ZFUGR_UTIL)
  includeSource?: boolean; // Whether to also return the main include source code (default: false)
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
  "name": "get_function_group",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "groupName": "<groupName>"
  }
}
```

## Underlying contract

- `client.adt.functions.groups.get`
- `client.adt.functions.groups.source.main.get`

## See also

- [MCP overview](../overview.md)
