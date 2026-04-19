---
title: checkin
sidebar_label: checkin
description: "Push a local abapGit/gCTS-formatted directory into SAP (inverse of `import_package`). Mirrors `adt checkin`."
---

# `checkin`

Push a local abapGit/gCTS-formatted directory into SAP (inverse of `import_package`). Mirrors `adt checkin`.

Defined in [`packages/adt-mcp/src/lib/tools/checkin.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/checkin.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  sourceDir: string; // Local directory containing serialised files
  format?: string; // Format id — e.g. 'abapgit' (default) or 'gcts'
  rootPackage?: string; // Target root SAP package (required for PREFIX folder logic)
  transport?: string; // Transport request (e.g. DEVK900001)
  objectTypes?: string[]; // Filter to these ABAP types (e.g. ["CLAS","INTF"])
  dryRun?: boolean; // If true, build the plan but do not modify SAP
  activate?: boolean; // Activate saved objects after apply (default true)
  unlock?: boolean; // Force-unlock stale locks owned by current user
  abapLanguageVersion?: string; // ABAP language version — e.g. '5' for Cloud
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
  "name": "checkin",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "sourceDir": "<sourceDir>"
  }
}
```

## Underlying contract

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
