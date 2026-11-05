# @abapify/adt-schemas

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-schemas)](https://www.npmjs.com/package/@abapify/adt-schemas)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

ADT XML schemas generated from SAP XSD definitions.

## Install

```bash
npm install @abapify/adt-schemas
```

## Usage

```ts
import { classes } from '@abapify/adt-schemas';

const data = classes.parse(xml); // fully typed
const out = classes.build(data);
```

## Features

- Typed parse / build for ADT XML, generated from SAP XSDs
- 200+ schemas: objects, transports, ATC, AUnit, discovery, …
- Powered by `@abapify/ts-xsd`

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-schemas](https://adt-cli.netlify.app/sdk/packages/adt-schemas)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
