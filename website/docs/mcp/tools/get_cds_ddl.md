---
title: get_cds_ddl
sidebar_label: get_cds_ddl
description: 'Fetch CDS DDL source (DDLS) metadata, optionally including the DDL source code.'
---

# `get_cds_ddl`

Fetch CDS DDL source (DDLS) metadata, optionally including the DDL source code.

Defined in [`packages/adt-mcp/src/lib/tools/get-cds-ddl.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/get-cds-ddl.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  ddlName: string; // DDL source name (e.g. ZDDL_SAMPLE)
  includeSource?: boolean; // Include DDL source code
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
  "name": "get_cds_ddl",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "ddlName": "<ddlName>"
  }
}
```

## Underlying contract

- `client.adt.ddic.ddl.sources.get`
- `client.adt.ddic.ddl.sources.source.main.get`

## See also

- [MCP overview](../overview.md)
