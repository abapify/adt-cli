# @abapify/aclass

[![npm](https://img.shields.io/npm/v/%40abapify%2Faclass)](https://www.npmjs.com/package/@abapify/aclass)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

ABAP OO source parser — tokenizer, Chevrotain CstParser, and typed AST for CLASS / INTERFACE declarations.

## Install

```bash
npm install @abapify/aclass
```

## Usage

```ts
import { parse } from '@abapify/aclass';

const { ast, errors } =
  parse(`CLASS zcl_demo DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    METHODS run.
ENDCLASS.`);

for (const def of ast.definitions) {
  if (def.kind === 'ClassDef') console.log(def.name, def.isFinal);
}
```

## Features

- Chevrotain-based lexer and parser for CLASS / INTERFACE declarations
- Typed AST: sections, methods, parameters, types, ABAPDoc
- Source spans for every node; `assertCleanParse` for strict use

## Documentation

**[adt-cli.netlify.app/sdk/packages/aclass](https://adt-cli.netlify.app/sdk/packages/aclass)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
