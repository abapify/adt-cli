---
title: list_certs
sidebar_label: list_certs
description: "List X.509 certificates installed in a STRUST PSE."
---

# `list_certs`

List X.509 certificates installed in a STRUST PSE.

Defined in [`packages/adt-mcp/src/lib/tools/list-certs.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/list-certs.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  context: string; // PSE context (e.g. SSLC, SSLS)
  applic: string; // PSE application (e.g. DFAULT, ANONYM)
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
  "name": "list_certs",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "context": "<context>",
      "applic": "<applic>"
  }
}
```

## Underlying contract

- `client.adt.system.security.pses.listCertificates`

## See also

- [MCP overview](../overview.md)
