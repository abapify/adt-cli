# @abapify/adt-proxy

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-proxy)](https://www.npmjs.com/package/@abapify/adt-proxy)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

ADT proxy server with JSON↔XML conversion.

## Install

```bash
npm install @abapify/adt-proxy
```

## Usage

```ts
import { createAdtProxy } from '@abapify/adt-proxy';

const proxy = createAdtProxy({
  targetUrl: 'https://sap.example.com',
  auth: {
    username: 'DEVELOPER',
    password: process.env.SAP_PASSWORD!,
    client: '100',
  },
});
const { port } = await proxy.start();
```

## Features

- Local HTTP proxy in front of an SAP ADT system
- Contract-based JSON ↔ XML conversion
- Forwards unknown routes as-is

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-proxy](https://adt-cli.netlify.app/sdk/packages/adt-proxy)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
