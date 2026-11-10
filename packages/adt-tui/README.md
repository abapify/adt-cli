# @abapify/adt-tui

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-tui)](https://www.npmjs.com/package/@abapify/adt-tui)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Terminal UI components for ADT - page-based navigation with Ink.

## Install

```bash
npm install @abapify/adt-tui
```

## Usage

```ts
import { run } from '@abapify/adt-tui';

await run({
  fetch: async (uri) => String(await client.fetch(uri)),
  startUrl: '/sap/bc/adt/repository/nodestructure',
});
```

## Features

- Ink-based terminal UI for browsing ADT resources
- Page-based navigation with link following

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-tui](https://adt-cli.netlify.app/sdk/packages/adt-tui)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
