---
title: grep_packages
sidebar_label: grep_packages
description: "Regex search for a pattern across all ABAP source code within a package (and optionally its subpackages)"
---

# `grep_packages`

Regex search for a pattern across all ABAP source code within a package (and optionally its subpackages)

Defined in [`packages/adt-mcp/src/lib/tools/grep-packages.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/grep-packages.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  pattern: string; // Search pattern (regex or literal string)
  packageName: string; // ABAP package name to search within (e.g. ZPACKAGE)
  includeSubPackages?: boolean; // Also search subpackages (default: true)
  maxResults?: number; // Maximum number of results (default: 50)
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
  "name": "grep_packages",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "pattern": "<pattern>",
      "packageName": "<packageName>"
  }
}
```

## Underlying contract

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
