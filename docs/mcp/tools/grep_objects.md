---
title: grep_objects
sidebar_label: grep_objects
description: "Regex search for a pattern within ABAP object source code. Provide either a list of object URIs or name+type pairs to resolve them."
---

# `grep_objects`

Regex search for a pattern within ABAP object source code. Provide either a list of object URIs or name+type pairs to resolve them.

Defined in [`packages/adt-mcp/src/lib/tools/grep-objects.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/grep-objects.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  pattern: string; // Search pattern (regex or literal string)
  objectUris?: string[]; // List of ADT object URIs to search within (e.g. /sap/bc/adt/oo/classes/zcl_example)
  objects?: object[]; // ABAP object name
  maxResults?: number; // Maximum number of results (default: 50)
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
  "name": "grep_objects",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "pattern": "<pattern>"
  }
}
```

## Underlying contract

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
