---
title: create_badi
sidebar_label: create_badi
description: 'Create a new Enhancement Implementation (ENHO/XHH — BAdI container).'
---

# `create_badi`

Create a new Enhancement Implementation (ENHO/XHH — BAdI container).

Defined in [`packages/adt-mcp/src/lib/tools/create-badi.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/create-badi.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  badiName: string; // Enhancement Implementation name (uppercase)
  description: string; // Short description
  packageName: string; // ABAP package to assign the ENHO to (e.g. $TMP)
  transport?: string; // Transport request number (required for transportable)
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
  "name": "create_badi",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "badiName": "<badiName>",
    "description": "<description>",
    "packageName": "<packageName>"
  }
}
```

## Underlying contract

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
