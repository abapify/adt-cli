---
title: call_rfc
sidebar_label: call_rfc
description: 'Invoke a classic RFC function module on the SAP system via SOAP-over-HTTP (/sap/bc/soap/rfc). Use this for BAPIs, STFC_CONNECTION, custom RFC FMs, etc.'
---

# `call_rfc`

Invoke a classic RFC function module on the SAP system via SOAP-over-HTTP (/sap/bc/soap/rfc). Use this for BAPIs, STFC_CONNECTION, custom RFC FMs, etc.

Defined in [`packages/adt-mcp/src/lib/tools/call-rfc.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/call-rfc.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  functionModule: string; // RFC function module name (case-insensitive, e.g. "STFC_CONNECTION")
  parameters?: Record<string, unknown>; // Flat key/value map of RFC parameters. Scalars as strings; structures as objects; tables as arrays of objects.
  client?: string; // Override sap-client query parameter
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
  "name": "call_rfc",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "functionModule": "<functionModule>"
  }
}
```

## Underlying contract

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
