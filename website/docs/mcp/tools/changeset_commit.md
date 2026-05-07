---
title: changeset_commit
sidebar_label: changeset_commit
description: 'Activate every object staged in the current changeset (single batch POST to /sap/bc/adt/activation), release all locks, clear the session pointer.'
---

# `changeset_commit`

Activate every object staged in the current changeset (single batch POST to /sap/bc/adt/activation), release all locks, clear the session pointer.

Defined in [`packages/adt-mcp/src/lib/tools/changeset-commit.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/changeset-commit.ts).

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
