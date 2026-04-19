---
title: import_object
sidebar_label: import_object
description: "Import a single ABAP object (by name) into a local folder in abapGit format. Mirrors `adt import object`."
---

# `import_object`

Import a single ABAP object (by name) into a local folder in abapGit format. Mirrors `adt import object`.

Defined in [`packages/adt-mcp/src/lib/tools/import-object.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/import-object.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  objectType: string; // ABAP object type (e.g. CLAS, INTF, PROG, FUGR, DOMA). Used as a hint.
  objectName: string; // ABAP object name (case-insensitive)
  outputDir?: string; // Target directory for the serialised files (default: ./imported)
  format?: string; // Format plugin name, default 'abapgit'
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
  "name": "import_object",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "objectType": "<objectType>",
      "objectName": "<objectName>"
  }
}
```

## Underlying contract

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
