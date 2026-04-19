---
title: stat_package
sidebar_label: stat_package
description: "Check whether an ABAP package exists. Returns { exists, metadata? }."
---

# `stat_package`

Check whether an ABAP package exists. Returns \{ exists, metadata? \}.

Defined in [`packages/adt-mcp/src/lib/tools/stat-package.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/stat-package.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  packageName: string; // Package name (e.g. ZPACKAGE)
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
  "name": "stat_package",
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

## See also

- [MCP overview](../overview.md)
