# @abapify/acds

[![npm](https://img.shields.io/npm/v/%40abapify%2Facds)](https://www.npmjs.com/package/@abapify/acds)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

ABAP CDS source parser — tokenizer, parser, and AST for all DDL-based ABAP source types.

## Install

```bash
npm install @abapify/acds
```

## Usage

```ts
import { parse } from '@abapify/acds';

const { ast, errors } = parse(`define table ztable {
  key mandt : abap.clnt not null;
  key field1 : abap.char(10) not null;
}`);
```

## Features

- Tokenizer, parser, and typed AST for DDL-based CDS sources
- Tables, structures, views, entities, and annotations
- Error recovery with source positions

## Documentation

**[adt-cli.netlify.app/sdk/packages/acds](https://adt-cli.netlify.app/sdk/packages/acds)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
