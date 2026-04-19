---
title: publish_service_binding
sidebar_label: publish_service_binding
description: "Publish (or unpublish) a RAP Service Binding (SRVB) in SAP. Pass `unpublish: true` to deactivate. Delegates to the typed SRVB contract."
---

# `publish_service_binding`

Publish (or unpublish) a RAP Service Binding (SRVB) in SAP. Pass `unpublish: true` to deactivate. Delegates to the typed SRVB contract.

Defined in [`packages/adt-mcp/src/lib/tools/publish-service-binding.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/publish-service-binding.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  bindingName: string; // Service binding name (e.g. ZUI_MYAPP_O4)
  unpublish?: boolean; // If true, unpublishes (deactivates) the service binding instead (default: false)
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
  "name": "publish_service_binding",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "bindingName": "<bindingName>"
  }
}
```

## Underlying contract

_No direct contract call detected (see source)._

## See also

- [MCP overview](../overview.md)
