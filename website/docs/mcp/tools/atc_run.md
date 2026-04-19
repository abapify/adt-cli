---
title: atc_run
sidebar_label: atc_run
description: 'Run ABAP Test Cockpit (ATC) checks on an object or package'
---

# `atc_run`

Run ABAP Test Cockpit (ATC) checks on an object or package

Defined in [`packages/adt-mcp/src/lib/tools/atc-run.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/atc-run.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  objectUri: string; // ADT URI of the object or package to check (e.g. /sap/bc/adt/packages/ZPACKAGE)
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
  "name": "atc_run",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "objectUri": "<objectUri>"
  }
}
```

## Underlying contract

- `client.adt.atc.worklists.get`

## See also

- [MCP overview](../overview.md)
