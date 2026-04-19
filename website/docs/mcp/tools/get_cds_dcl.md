---
title: get_cds_dcl
sidebar_label: get_cds_dcl
description: 'Fetch CDS DCL access control source (DCLS) metadata, optionally including the source code.'
---

# `get_cds_dcl`

Fetch CDS DCL access control source (DCLS) metadata, optionally including the source code.

Defined in [`packages/adt-mcp/src/lib/tools/get-cds-dcl.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/get-cds-dcl.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  dclName: string; // DCL source name (e.g. ZDCL_SAMPLE)
  includeSource?: boolean; // Include DCL source code
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
  "name": "get_cds_dcl",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "dclName": "<dclName>"
  }
}
```

## Underlying contract

- `client.adt.ddic.dcl.sources.get`
- `client.adt.ddic.dcl.sources.source.main.get`

## See also

- [MCP overview](../overview.md)
