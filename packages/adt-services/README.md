# @abapify/adt-services

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-services)](https://www.npmjs.com/package/@abapify/adt-services)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Transport-agnostic ADT service layer shared by adt-cli and adt-mcp.

## Install

```bash
npm install @abapify/adt-services
```

## Usage

```ts
import { getAdtClientV2, getSource } from '@abapify/adt-services';

const client = await getAdtClientV2();
const result = await getSource(client, {
  objectName: 'ZCL_DEMO',
  objectType: 'CLAS',
});
```

## Features

- Transport-agnostic services shared by `adt-cli` and `adt-mcp`
- Source, check-in, CTS, changesets, BAdIs, and more
- Destination and auth resolution helpers

## Import diagnostics

Transport imports expose optional, versioned acquisition omissions while
preserving failed counters. CLI and MCP share the same service contract; see the
SDK reference for the schema and error boundaries.

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-services](https://adt-cli.netlify.app/sdk/packages/adt-services)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
