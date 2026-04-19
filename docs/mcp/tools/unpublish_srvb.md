---
title: unpublish_srvb
sidebar_label: unpublish_srvb
description: "Unpublish (deactivate) a RAP Service Binding (SRVB) so it is no longer exposed via the SAP Gateway."
---

# `unpublish_srvb`

Unpublish (deactivate) a RAP Service Binding (SRVB) so it is no longer exposed via the SAP Gateway.

Defined in [`packages/adt-mcp/src/lib/tools/unpublish-srvb.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/unpublish-srvb.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  srvbName: string; // SRVB name
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
  "name": "unpublish_srvb",
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

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
