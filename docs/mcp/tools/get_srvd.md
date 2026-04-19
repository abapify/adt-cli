---
title: get_srvd
sidebar_label: get_srvd
description: "Fetch RAP Service Definition (SRVD) metadata, optionally including the .asrvd source code."
---

# `get_srvd`

Fetch RAP Service Definition (SRVD) metadata, optionally including the .asrvd source code.

Defined in [`packages/adt-mcp/src/lib/tools/get-srvd.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/get-srvd.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  srvdName: string; // SRVD name (e.g. ZUI_MY_SERVICE)
  includeSource?: boolean; // Include the .asrvd source text
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
  "name": "get_srvd",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "srvdName": "<srvdName>"
  }
}
```

## Underlying contract

- `client.adt.ddic.srvd.sources.get`
- `client.adt.ddic.srvd.sources.source.main.get`

## See also

- [MCP overview](../overview.md)
