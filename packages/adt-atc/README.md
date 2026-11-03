# @abapify/adt-atc

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-atc)](https://www.npmjs.com/package/@abapify/adt-atc)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

ABAP Test Cockpit (ATC) CLI plugin for adt-cli.

## Install

```bash
npm install @abapify/adt-atc @abapify/adt-cli
```

## Usage

Register the command plugin in your project config:

```ts
// adt.config.ts
export default {
  commands: ['@abapify/adt-atc/commands/atc'],
};
```

Then:

```bash
adt atc --package ZMY_PKG --format sarif --output atc.sarif
```

## Features

- Run ABAP Test Cockpit checks on packages, objects, or transports
- Console, JSON, GitLab Code Quality, and SARIF output
- Custom check variants and finding resolvers for path / line mapping

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-atc](https://adt-cli.netlify.app/sdk/packages/adt-atc)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
