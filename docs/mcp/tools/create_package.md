---
title: create_package
sidebar_label: create_package
description: "Create a new ABAP development package (DEVC). Omit transport for local ($TMP) packages."
---

# `create_package`

Create a new ABAP development package (DEVC). Omit transport for local ($TMP) packages.

Defined in [`packages/adt-mcp/src/lib/tools/create-package.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/create-package.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  packageName: string; // Package name (e.g. ZPACKAGE, $TMP_TEST)
  description: string; // Short description of the package
  parentPackage?: string; // Parent package name (e.g. ZROOT). If omitted the package is created at the top level.
  packageType?: 'development' | 'structure' | 'main'; // Package type (default: development)
  transport?: string; // Transport request number. Omit for local packages (e.g. $-prefixed names).
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
  "name": "create_package",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "packageName": "<packageName>",
      "description": "<description>"
  }
}
```

## Underlying contract

- `client.adt.packages.post`

## See also

- [MCP overview](../overview.md)
