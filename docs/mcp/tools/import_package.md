---
title: import_package
sidebar_label: import_package
description: "Recursively import all objects in an ABAP package to a local folder in abapGit format. Mirrors `adt import package`."
---

# `import_package`

Recursively import all objects in an ABAP package to a local folder in abapGit format. Mirrors `adt import package`.

Defined in [`packages/adt-mcp/src/lib/tools/import-package.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/import-package.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  packageName: string; // ABAP package name (e.g. Z_MY_PACKAGE)
  outputDir?: string; // Target directory (default: ./imported)
  recursive?: boolean; // Include subpackages (default: true)
  format?: string; // Format plugin name, default 'abapgit'
  objectTypes?: string[]; // Optional list of object types to filter (e.g. ["CLAS","INTF"])
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
  "name": "import_package",
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

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
