---
title: changeset_rollback
sidebar_label: changeset_rollback
description: 'Release every lock held by the current changeset and mark it rolled back. Source PUTs are not reverted (SAP has no transactional discard — the inactive version stays until the next edit/activate cycle).'
---

# `changeset_rollback`

Release every lock held by the current changeset and mark it rolled back. Source PUTs are not reverted (SAP has no transactional discard — the inactive version stays until the next edit/activate cycle).

Defined in [`packages/adt-mcp/src/lib/tools/changeset-rollback.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/changeset-rollback.ts).

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
