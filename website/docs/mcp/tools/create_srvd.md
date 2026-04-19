---
title: create_srvd
sidebar_label: create_srvd
description: 'Create a new RAP Service Definition (SRVD) object.'
---

# `create_srvd`

Create a new RAP Service Definition (SRVD) object.

Defined in [`packages/adt-mcp/src/lib/tools/create-srvd.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/create-srvd.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  srvdName: string; // SRVD name (uppercase, e.g. ZUI_MY_SERVICE)
  description: string; // Short description
  packageName: string; // ABAP package to assign the SRVD to (e.g. $TMP)
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
  "name": "create_srvd",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "srvdName": "<srvdName>",
    "description": "<description>",
    "packageName": "<packageName>"
  }
}
```

## Underlying contract

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
