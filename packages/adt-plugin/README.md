# @abapify/adt-plugin

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-plugin)](https://www.npmjs.com/package/@abapify/adt-plugin)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

ADT Plugin interface and factory for abapify.

## Install

```bash
npm install @abapify/adt-plugin
```

## Usage

```ts
import { createPlugin } from '@abapify/adt-plugin';

export const myPlugin = createPlugin({
  name: 'myFormat',
  version: '1.0.0',
  registry: {
    isSupported: (type) => ['CLAS', 'INTF'].includes(type),
    getSupportedTypes: () => ['CLAS', 'INTF'],
  },
  // ... serialization services
});
```

## Features

- Interface and factory for abapify format plugins
- Registry of supported object types
- Shared contract for abapGit, gCTS, and custom formats

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-plugin](https://adt-cli.netlify.app/sdk/packages/adt-plugin)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
