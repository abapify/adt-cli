---
title: list_flp_groups
sidebar_label: list_flp_groups
description: 'List Fiori Launchpad groups (Page Builder "Pages") via OData'
---

# `list_flp_groups`

List Fiori Launchpad groups (Page Builder "Pages") via OData

Defined in [`packages/adt-mcp/src/lib/tools/list-flp-groups.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/list-flp-groups.ts).

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
  "name": "list_flp_groups",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100"
  }
}
```

## Underlying contract

- `client.adt.flp.groups.list`

## See also

- [MCP overview](../overview.md)
