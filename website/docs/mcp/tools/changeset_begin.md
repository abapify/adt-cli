---
title: changeset_begin
sidebar_label: changeset_begin
description: 'Open a transactional unit-of-work bound to the current MCP session. Pair with changeset_add, changeset_commit, changeset_rollback.'
---

# `changeset_begin`

Open a transactional unit-of-work bound to the current MCP session. Pair with changeset_add, changeset_commit, changeset_rollback.

Defined in [`packages/adt-mcp/src/lib/tools/changeset-begin.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/changeset-begin.ts).

## Input schema

```ts
{
  baseUrl?: string; // SAP system base URL (e.g. https://host:8000)
  client?: string; // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  systemId?: string;
  description?: string; // Free-text description recorded on the changeset
  force?: boolean; // Auto-rollback any existing open changeset first
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
