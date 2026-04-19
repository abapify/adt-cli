---
title: get_package
sidebar_label: get_package
description: "Get metadata for an ABAP package, optionally including its contained objects."
---

# `get_package`

Get metadata for an ABAP package, optionally including its contained objects.

Defined in [`packages/adt-mcp/src/lib/tools/get-package.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/get-package.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  packageName: string; // Package name (e.g. ZPACKAGE)
  includeObjects?: boolean; // If true, also list the objects contained in the package.
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
  "name": "get_package",
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

- `client.adt.packages.get`
- `client.adt.repository.informationsystem.search.quickSearch`

## See also

- [MCP overview](../overview.md)
