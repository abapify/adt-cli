---
title: find_references
sidebar_label: find_references
description: 'Find all usages (where-used) of an ABAP object or symbol. Uses the 2-step POST /usageReferences protocol.'
---

# `find_references`

Find all usages (where-used) of an ABAP object or symbol. Uses the 2-step POST /usageReferences protocol.

Defined in [`packages/adt-mcp/src/lib/tools/find-references.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/find-references.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  objectName: string; // Name of the ABAP object to find references for
  objectType?: string; // Object type (e.g. CLAS, PROG, DTEL, TABL)
  objectUri?: string; // Direct ADT URI of the object (skips name resolution if provided)
  maxResults?: number; // Maximum number of results (default: 100)
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
  "name": "find_references",
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

- `client.adt.repository.informationsystem.usageReferences.scope.post`
- `client.adt.repository.informationsystem.usageReferences.search.post`

## See also

- [MCP overview](../overview.md)
