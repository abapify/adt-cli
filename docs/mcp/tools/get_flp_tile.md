---
title: get_flp_tile
sidebar_label: get_flp_tile
description: 'Get a single Fiori Launchpad tile (CHIP) by its full CHIP ID'
---

# `get_flp_tile`

Get a single Fiori Launchpad tile (CHIP) by its full CHIP ID

Defined in [`packages/adt-mcp/src/lib/tools/get-flp-tile.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/get-flp-tile.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  tileId: string; // CHIP ID, e.g. X-SAP-UI2-CHIP:/UI2/STATIC_APPLAUNCHER
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
  "name": "get_flp_tile",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "tileId": "<tileId>"
  }
}
```

## Underlying contract

- `client.adt.flp.tiles.get`

## See also

- [MCP overview](../overview.md)
