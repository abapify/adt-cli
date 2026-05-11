---
title: sap_disconnect
sidebar_label: sap_disconnect
description: 'Close the SAP ADT session bound to the current MCP session (idempotent).'
---

# `sap_disconnect`

Close the SAP ADT session bound to the current MCP session (idempotent).

Defined in [`packages/adt-mcp/src/lib/tools/sap-disconnect.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/sap-disconnect.ts).

## Input schema

_This tool takes no parameters._

## Output

The tool returns a single text content item whose body is a JSON-serialised object (`content[0].text`). On error, the response has `isError: true` and a human-readable message.

```json
{
  "content": [{ "type": "text", "text": "<JSON.stringify(result, null, 2)>" }]
}
```

See the source for the exact shape of `result`.
