---
title: get_test_classes
sidebar_label: get_test_classes
description: 'Get the test class definitions (FOR TESTING) embedded in an ABAP class'
---

# `get_test_classes`

Get the test class definitions (FOR TESTING) embedded in an ABAP class

Defined in [`packages/adt-mcp/src/lib/tools/get-test-classes.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/get-test-classes.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  className: string; // ABAP class name (e.g. ZCL_MY_CLASS)
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
  "name": "get_test_classes",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "className": "<className>"
  }
}
```

## Underlying contract

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
