---
title: changeset_add
sidebar_label: changeset_add
description: 'Stage an object write into the current open changeset: lock + PUT source. Activation is deferred to changeset_commit.'
---

# `changeset_add`

Stage an object write into the current open changeset: lock + PUT source. Activation is deferred to changeset_commit.

Defined in [`packages/adt-mcp/src/lib/tools/changeset-add.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/changeset-add.ts).

## Input schema

```ts
{
  baseUrl?: string; // SAP system base URL (e.g. https://host:8000)
  client?: string; // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  systemId?: string;
  objectName: string; // ABAP object name
  objectType: string; // Object type (e.g. PROG, CLAS, INTF, FUGR)
  source: string; // New ABAP source code
  transport?: string; // Transport request (required for transportable objects)
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
