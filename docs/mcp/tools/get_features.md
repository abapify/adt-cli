---
title: get_features
sidebar_label: get_features
description: "Probe the SAP system for available ADT features (abapGit, RAP, AMDP, UI5, ATC, CTS, etc.)."
---

# `get_features`

Probe the SAP system for available ADT features (abapGit, RAP, AMDP, UI5, ATC, CTS, etc.).

Defined in [`packages/adt-mcp/src/lib/tools/get-installed-components.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/get-installed-components.ts).

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
  "content": [
    { "type": "text", "text": "<JSON.stringify(result, null, 2)>" }
  ]
}
```

See the source for the exact shape of `result`.

## Example invocation

```json
{
  "name": "get_features",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100"
  }
}
```

## Underlying contract

- `client.adt.discovery.getDiscovery`

## See also

- [MCP overview](../overview.md)
