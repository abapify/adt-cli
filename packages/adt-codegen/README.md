# @abapify/adt-codegen

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-codegen)](https://www.npmjs.com/package/@abapify/adt-codegen)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Code generation toolkit for SAP ADT APIs.

## Install

```bash
npm install @abapify/adt-codegen
```

## Usage

```typescript
export const myPlugin = definePlugin({
  name: 'my-plugin',

  hooks: {
    workspace(ws) {
      // Called for each workspace
    },

    collection(coll) {
      // Called for each collection
    },

    finalize(ctx) {
      // Called once at the end
    },
  },
});
```

## Features

- Hook-based code generation from ADT discovery data
- Built-in plugins for collections, templates, and types
- `adt-codegen` binary plus programmatic API

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-codegen](https://adt-cli.netlify.app/sdk/packages/adt-codegen)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
