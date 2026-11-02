# @abapify/adt-auth

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-auth)](https://www.npmjs.com/package/@abapify/adt-auth)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Authentication package for SAP ADT systems - supports multiple auth methods.

## Install

```bash
npm install @abapify/adt-auth
```

## Usage

```ts
import { AuthManager } from '@abapify/adt-auth';

const auth = new AuthManager();
const session = await auth.login('DEV', {
  plugin: '@abapify/adt-auth/plugins/basic',
  options: {
    url: 'https://sap.example.com',
    username: 'DEVELOPER',
    password: process.env.SAP_PASSWORD,
  },
});
```

## Features

- Plugin-based credential acquisition (`basic`, `service-key`, browser SSO)
- File-backed session storage per destination
- BTP service-key helpers (`readServiceKey`, `resolveServiceKeyFromEnv`)

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-auth](https://adt-cli.netlify.app/sdk/packages/adt-auth)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
