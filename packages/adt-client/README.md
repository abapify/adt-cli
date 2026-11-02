# @abapify/adt-client

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-client)](https://www.npmjs.com/package/@abapify/adt-client)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Minimalistic speci-based ADT client for SAP ABAP Development Tools.

## Install

```bash
npm install @abapify/adt-client
```

## Usage

```ts
import { createAdtClient } from '@abapify/adt-client';

const client = createAdtClient({
  baseUrl: 'https://sap.example.com',
  username: 'DEVELOPER',
  password: process.env.SAP_PASSWORD,
  client: '100',
});

const discovery = await client.fetch('/sap/bc/adt/discovery');
```

## Features

- Contract-driven, fully typed ADT REST client
- Security session, CSRF token, and cookie handling
- Basic, cookie (SSO), and bearer-token authentication

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-client](https://adt-cli.netlify.app/sdk/packages/adt-client)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
