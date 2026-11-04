# @abapify/adt-puppeteer

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-puppeteer)](https://www.npmjs.com/package/@abapify/adt-puppeteer)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Puppeteer-based authentication for SAP ADT (SSO/IDP).

## Install

```bash
npm install @abapify/adt-puppeteer
```

## Usage

```ts
// adt.config.ts
import { defineConfig } from '@abapify/adt-config';
import { withPuppeteer } from '@abapify/adt-puppeteer';

export default withPuppeteer(
  defineConfig({ destinations: { DEV: 'https://sap-dev.example.com' } }),
);
```

## Features

- Browser-based SSO login (SAML / IdP) with Puppeteer
- Session cookie persistence and reuse
- Drop-in wrapper for `adt.config.ts`

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-puppeteer](https://adt-cli.netlify.app/sdk/packages/adt-puppeteer)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
