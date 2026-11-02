# @abapify/adt-diff

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-diff)](https://www.npmjs.com/package/@abapify/adt-diff)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Diff CLI plugin for adt-cli - compare local serialized files against SAP remote source.

## Install

```bash
npm install @abapify/adt-diff @abapify/adt-cli
```

## Usage

Register the command plugin in your project config:

```ts
// adt.config.ts
export default {
  commands: ['@abapify/adt-diff/commands/diff'],
};
```

Then:

```bash
adt diff zcl_my_class.clas.xml
```

## Features

- Compare local abapGit / gCTS files with SAP
- Unified diff output for review and CI

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-diff](https://adt-cli.netlify.app/sdk/packages/adt-diff)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
