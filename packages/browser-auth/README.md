# @abapify/browser-auth

[![npm](https://img.shields.io/npm/v/%40abapify%2Fbrowser-auth)](https://www.npmjs.com/package/@abapify/browser-auth)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Browser-based SSO authentication core - shared logic for Playwright/Puppeteer plugins.

## Install

```bash
npm install @abapify/browser-auth
```

## Usage

```ts
import { authenticate, toCookieHeader } from '@abapify/browser-auth';

const credentials = await authenticate(adapter, {
  url: 'https://sap.example.com',
});
const cookie = toCookieHeader(credentials);
```

## Features

- Shared browser-SSO flow for Playwright and Puppeteer adapters
- `BrowserAdapter` interface for new browser engines
- Cookie filtering and header helpers

## Documentation

**[adt-cli.netlify.app/sdk/packages/browser-auth](https://adt-cli.netlify.app/sdk/packages/browser-auth)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
