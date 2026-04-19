---
title: get_srvb
sidebar_label: get_srvb
description: 'Fetch RAP Service Binding (SRVB) metadata. SRVB has no source text; only the binding XML is returned.'
---

# `get_srvb`

Fetch RAP Service Binding (SRVB) metadata. SRVB has no source text; only the binding XML is returned.

Defined in [`packages/adt-mcp/src/lib/tools/get-srvb.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/get-srvb.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  srvbName: string; // SRVB name (e.g. ZUI_MY_BINDING)
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
  "name": "get_srvb",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "srvbName": "<srvbName>"
  }
}
```

## Underlying contract

- `client.adt.businessservices.bindings.get`

## See also

- [MCP overview](../overview.md)
