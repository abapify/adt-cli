---
title: gcts_checkout_branch
sidebar_label: gcts_checkout_branch
description: "Check out a branch in a gCTS repository"
---

# `gcts_checkout_branch`

Check out a branch in a gCTS repository

Defined in [`packages/adt-mcp/src/lib/tools/gcts-tools.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/gcts-tools.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  rid: string; // Repository ID
  branch: string; // Target branch
  currentBranch?: string; // Current branch (auto-detected if omitted)
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
  "name": "gcts_checkout_branch",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "rid": "<rid>",
      "branch": "<branch>"
  }
}
```

## Underlying contract

- `client.adt.gcts.repository.get`
- `client.adt.gcts.repository.checkout`

## See also

- [MCP overview](../overview.md)
