# @abapify/adt-export

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-export)](https://www.npmjs.com/package/@abapify/adt-export)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Export CLI plugin for adt-cli - deploy local files to SAP.

## Install

```bash
npm install @abapify/adt-export @abapify/adt-cli
```

## Usage

Register the command plugin in your project config:

```ts
// adt.config.ts
export default {
  commands: ['@abapify/adt-export/commands/export'],
};
```

Then:

```bash
adt export --source ./src
```

## Features

- Deploy local serialized files to SAP
- Create missing objects, lock, write, and activate
- Works with any registered format plugin

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-export](https://adt-cli.netlify.app/sdk/packages/adt-export)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
