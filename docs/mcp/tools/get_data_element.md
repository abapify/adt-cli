---
title: get_data_element
sidebar_label: get_data_element
description: "Fetch DDIC data element metadata."
---

# `get_data_element`

Fetch DDIC data element metadata.

Defined in [`packages/adt-mcp/src/lib/tools/get-data-element.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/get-data-element.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  dataElementName: string; // Data element name (e.g. ZDTEL_SAMPLE)
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
  "name": "get_data_element",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "dataElementName": "<dataElementName>"
  }
}
```

## Underlying contract

- `client.adt.ddic.dataelements.get`

## See also

- [MCP overview](../overview.md)
