---
title: find_definition
sidebar_label: find_definition
description: "Resolve an ABAP symbol (class, interface, function, data element, …) to its ADT object URI."
---

# `find_definition`

Resolve an ABAP symbol (class, interface, function, data element, …) to its ADT object URI.

Defined in [`packages/adt-mcp/src/lib/tools/find-definition.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/find-definition.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  objectName: string; // Name of the symbol or object to resolve
  objectType?: string; // Object type to narrow the search (e.g. CLAS, PROG, DTEL, TABL)
  parentObjectName?: string; // Parent object name (e.g. class name when looking for a method) — currently used as a hint for scoping
  parentObjectType?: string; // Parent object type (e.g. CLAS)
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
  "name": "find_definition",
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

- `client.adt.repository.informationsystem.search.quickSearch`

## See also

- [MCP overview](../overview.md)
