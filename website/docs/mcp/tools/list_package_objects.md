---
title: list_package_objects
sidebar_label: list_package_objects
description: 'List ABAP objects contained in a package (uses quickSearch with packageName filter)'
---

# `list_package_objects`

List ABAP objects contained in a package (uses quickSearch with packageName filter)

Defined in [`packages/adt-mcp/src/lib/tools/list-package-objects.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/list-package-objects.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  packageName: string; // Package name (e.g. ZPACKAGE)
  objectType?: string; // Filter by object type (e.g. CLAS, PROG, INTF)
  maxResults?: number; // Maximum number of results (default: 200)
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
  "name": "list_package_objects",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "packageName": "<packageName>"
  }
}
```

## Underlying contract

- `client.adt.repository.informationsystem.search.quickSearch`

## See also

- [MCP overview](../overview.md)
