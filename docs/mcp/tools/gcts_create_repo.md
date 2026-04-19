---
title: gcts_create_repo
sidebar_label: gcts_create_repo
description: "Create a new gCTS repository (POST /repository)"
---

# `gcts_create_repo`

Create a new gCTS repository (POST /repository)

Defined in [`packages/adt-mcp/src/lib/tools/gcts-tools.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/gcts-tools.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  rid: string; // Repository ID
  url: string; // Git URL (https://...)
  vsid?: string; // Virtual system ID (default: 6IT)
  role?: 'SOURCE' | 'TARGET'; // Repository role (default: SOURCE)
  type?: 'GITHUB' | 'GIT'; // Repository type (default: GITHUB)
  startingFolder?: string; // Repository start directory (default: src/)
  vcsToken?: string; // VCS authentication token (if required)
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
  "name": "gcts_create_repo",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "rid": "<rid>",
      "url": "<url>"
  }
}
```

## Underlying contract

- `client.adt.gcts.repository.create`

## See also

- [MCP overview](../overview.md)
