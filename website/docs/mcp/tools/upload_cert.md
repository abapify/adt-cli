---
title: upload_cert
sidebar_label: upload_cert
description: 'Upload a PEM-encoded X.509 certificate into a STRUST PSE.'
---

# `upload_cert`

Upload a PEM-encoded X.509 certificate into a STRUST PSE.

Defined in [`packages/adt-mcp/src/lib/tools/upload-cert.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/upload-cert.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  context: string; // PSE context (e.g. SSLC, SSLS)
  applic: string; // PSE application (e.g. DFAULT, ANONYM)
  pem: string; // PEM-encoded certificate text (BEGIN/END CERTIFICATE blocks)
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
  "name": "upload_cert",
  "arguments": {
    "baseUrl": "https://sap.example.com:44300",
    "username": "DEVELOPER",
    "password": "***",
    "client": "100",
    "context": "<context>",
    "applic": "<applic>",
    "pem": "<pem>"
  }
}
```

## Underlying contract

- `client.adt.system.security.pses.uploadCertificate`

## See also

- [MCP overview](../overview.md)
