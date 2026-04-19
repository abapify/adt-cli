---
title: list_flp_catalogs
sidebar_label: list_flp_catalogs
description: 'List Fiori Launchpad catalogs via the Page Builder OData service'
---

# `list_flp_catalogs`

List Fiori Launchpad catalogs via the Page Builder OData service

Defined in [`packages/adt-mcp/src/lib/tools/list-flp-catalogs.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/list-flp-catalogs.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth

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
  "name": "list_flp_catalogs",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100"
  }
}
```

## Underlying contract

- `client.adt.flp.catalogs.list`

## See also

- [MCP overview](../overview.md)
