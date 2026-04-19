---
title: clone_object
sidebar_label: clone_object
description: "Copy an ABAP object to a new name. Supported types: PROG, CLAS, INTF. Creates the new object and copies the source code."
---

# `clone_object`

Copy an ABAP object to a new name. Supported types: PROG, CLAS, INTF. Creates the new object and copies the source code.

Defined in [`packages/adt-mcp/src/lib/tools/clone-object.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/clone-object.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  sourceObjectName: string; // Name of the source object to copy
  sourceObjectType: string; // Object type of the source: PROG, CLAS, or INTF
  targetObjectName: string; // Name for the new (cloned) object
  targetDescription?: string; // Description for the clone (defaults to source description with "Copy of" prefix)
  targetPackage?: string; // Package for the clone
  transport?: string; // Transport request number for the clone
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
  "name": "clone_object",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "sourceObjectName": "<sourceObjectName>",
      "sourceObjectType": "<sourceObjectType>",
      "targetObjectName": "<targetObjectName>"
  }
}
```

## Underlying contract

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
