---
title: sap_connect
sidebar_label: sap_connect
description: 'Open a SAP ADT session bound to the current MCP session. Subsequent tool calls on the same MCP session may omit connection args.'
---

# `sap_connect`

Open a SAP ADT session bound to the current MCP session. Subsequent tool calls on the same MCP session may omit connection args.

Defined in [`packages/adt-mcp/src/lib/tools/sap-connect.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/sap-connect.ts).

## Input schema

```ts
{
  baseUrl?: string; // SAP system base URL (e.g. https://host:8000)
  client?: string; // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  systemId?: string;
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

## Resolution order

`sap_connect` resolves the target client in this order:

1. explicit `baseUrl` (+ optional `client`, `username`, `password`)
2. `systemId` via server multi-system config
3. `systemId` via local `~/.adt/sessions/<systemId>.json` auth-store bridge

`baseUrl` and `systemId` are mutually exclusive.
