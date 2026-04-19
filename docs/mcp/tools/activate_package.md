---
title: activate_package
sidebar_label: activate_package
description: "Batch-activate all inactive objects in a package. Returns the count and list of activated objects."
---

# `activate_package`

Batch-activate all inactive objects in a package. Returns the count and list of activated objects.

Defined in [`packages/adt-mcp/src/lib/tools/activate-package.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/activate-package.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  packageName: string; // ABAP package name (e.g. ZPACKAGE)
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
  "name": "activate_package",
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

- `client.adt.activation.activate.post`

## See also

- [MCP overview](../overview.md)
