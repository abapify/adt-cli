# @abapify/adt-config

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-config)](https://www.npmjs.com/package/@abapify/adt-config)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Configuration loader for ADT CLI.

## Install

```bash
npm install @abapify/adt-config
```

## Usage

```ts
// adt.config.ts
import { defineConfig } from '@abapify/adt-config';

export default defineConfig({
  destinations: {
    DEV: 'https://sap-dev.example.com',
  },
});
```

## Features

- Typed `defineConfig` for destinations, plugins, and commands
- Config discovery and precedence (project → user → env)
- Shared by the CLI, MCP server, and SDK

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-config](https://adt-cli.netlify.app/sdk/packages/adt-config)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
