---
title: get_domain
sidebar_label: get_domain
description: "Fetch DDIC domain metadata (type information, fixed values, output info)."
---

# `get_domain`

Fetch DDIC domain metadata (type information, fixed values, output info).

Defined in [`packages/adt-mcp/src/lib/tools/get-domain.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/get-domain.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  domainName: string; // Domain name (e.g. ZDOM_SAMPLE)
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
  "name": "get_domain",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "domainName": "<domainName>"
  }
}
```

## Underlying contract

- `client.adt.ddic.domains.get`

## See also

- [MCP overview](../overview.md)
