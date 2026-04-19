---
title: activate_object
sidebar_label: activate_object
description: 'Activate one or more ABAP objects. Supply either objectName+objectType for a single object, or the objects array for batch activation.'
---

# `activate_object`

Activate one or more ABAP objects. Supply either objectName+objectType for a single object, or the objects array for batch activation.

Defined in [`packages/adt-mcp/src/lib/tools/activate-object.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/activate-object.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  objectName?: string; // ABAP object name (single-object mode)
  objectType?: string; // Object type (e.g. PROG, CLAS, INTF) (single-object mode)
  objects?: unknown[]; // Array of objects to activate (batch mode)
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
  "name": "activate_object",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100"
  }
}
```

## Underlying contract

- `client.adt.activation.activate.post`

## See also

- [MCP overview](../overview.md)
