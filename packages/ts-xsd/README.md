# @abapify/ts-xsd

[![npm](https://img.shields.io/npm/v/%40abapify%2Fts-xsd)](https://www.npmjs.com/package/@abapify/ts-xsd)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

W3C XSD 1.1 parser, builder, and TypeScript type inference.

## Install

```bash
npm install @abapify/ts-xsd
```

## Usage

```ts
import { parseXsd, buildXsd } from '@abapify/ts-xsd';

const schema = parseXsd(xsdString); // typed W3C XSD model
const xsd = buildXsd(schema);
```

## Features

- W3C XSD 1.1 parser and builder
- TypeScript type inference from `as const` schemas
- Codegen CLI (`ts-xsd`) for schema literals and interfaces

## Documentation

**[adt-cli.netlify.app/sdk/packages/ts-xsd](https://adt-cli.netlify.app/sdk/packages/ts-xsd)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
