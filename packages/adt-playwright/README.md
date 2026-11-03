# @abapify/adt-playwright

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-playwright)](https://www.npmjs.com/package/@abapify/adt-playwright)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Playwright-based SSO authentication plugin for ADT client.

## Install

```bash
npm install @abapify/adt-playwright
```

## Usage

```ts
// adt.config.ts
import { defineConfig } from '@abapify/adt-config';
import { withPlaywright } from '@abapify/adt-playwright';

export default withPlaywright(
  defineConfig({ destinations: { DEV: 'https://sap-dev.example.com' } }),
);
```

## Features

- Browser-based SSO login (SAML / IdP) with Playwright
- Session cookie persistence and reuse
- Drop-in wrapper for `adt.config.ts`

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-playwright](https://adt-cli.netlify.app/sdk/packages/adt-playwright)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
