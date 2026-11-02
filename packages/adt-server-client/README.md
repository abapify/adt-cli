# @abapify/adt-server-client

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-server-client)](https://www.npmjs.com/package/@abapify/adt-server-client)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Generated client for @abapify/adt-server OpenAPI.

## Install

```bash
npm install @abapify/adt-server-client
```

## Usage

```ts
import { createAdtServerClient } from '@abapify/adt-server-client';

const api = createAdtServerClient({
  baseUrl: 'http://127.0.0.1:3002',
  headers: { authorization: `Bearer ${token}` },
});
```

## Features

- Typed client generated from the `@abapify/adt-server` OpenAPI document
- Uses `fetch` — works in Node, Bun, and browsers
- Abort-signal support per request

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-server-client](https://adt-cli.netlify.app/sdk/packages/adt-server-client)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
