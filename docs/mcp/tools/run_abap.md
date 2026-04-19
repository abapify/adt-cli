---
title: run_abap
sidebar_label: run_abap
description: "Execute an ad-hoc ABAP snippet via a temporary IF_OO_ADT_CLASSRUN class. Creates the class, writes the source, activates, executes, then deletes (unless keepClass is true)."
---

# `run_abap`

Execute an ad-hoc ABAP snippet via a temporary IF_OO_ADT_CLASSRUN class. Creates the class, writes the source, activates, executes, then deletes (unless keepClass is true).

Defined in [`packages/adt-mcp/src/lib/tools/run-abap.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/run-abap.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  source: string; // ABAP source — either a bare method body or a full CLASS definition
  className?: string; // Temp class name (default: ZCL_ADTCLI_RUN)
  packageName?: string; // Package for temp class (default: $TMP)
  transport?: string; // Transport request (not needed for $TMP)
  keepClass?: boolean; // If true, do not delete the temp class after execution
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
  "name": "run_abap",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "source": "<source>"
  }
}
```

## Underlying contract

- `client.adt.oo.classes.post`
- `client.adt.activation.activate.post`
- `client.adt.oo.classrun.post`
- `client.adt.oo.classes.delete`

## See also

- [MCP overview](../overview.md)
