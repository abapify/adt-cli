---
title: get_type_hierarchy
sidebar_label: get_type_hierarchy
description: 'Get the type hierarchy (super/sub-types, implemented interfaces) of an ABAP class or interface.'
---

# `get_type_hierarchy`

Get the type hierarchy (super/sub-types, implemented interfaces) of an ABAP class or interface.

Defined in [`packages/adt-mcp/src/lib/tools/get-type-hierarchy.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/get-type-hierarchy.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  objectName: string; // Class or interface name (e.g. ZCL_MY_CLASS, ZIF_MY_INTF)
  objectType?: 'CLAS' | 'INTF'; // Object type: CLAS (class) or INTF (interface). Auto-detected if omitted.
  includeSubTypes?: boolean; // Whether to include sub-types (subclasses/implementors) in the result (default: false)
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
  "name": "get_type_hierarchy",
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

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
