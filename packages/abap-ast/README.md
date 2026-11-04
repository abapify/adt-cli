# @abapify/abap-ast

[![npm](https://img.shields.io/npm/v/%40abapify%2Fabap-ast)](https://www.npmjs.com/package/@abapify/abap-ast)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Zero-dependency typed AST and pretty-printer for ABAP source code (classes, interfaces, types, statements).

## Install

```bash
npm install @abapify/abap-ast
```

## Usage

```ts
import {
  print,
  classDef,
  section,
  methodDef,
  methodImpl,
  returnStmt,
} from '@abapify/abap-ast';

const cls = classDef({
  name: 'zcl_greeter',
  isFinal: true,
  sections: [
    section({
      visibility: 'public',
      members: [methodDef({ name: 'greet', visibility: 'public' })],
    }),
  ],
  implementations: [methodImpl({ name: 'greet', body: [returnStmt()] })],
});

console.log(print(cls)); // CLASS zcl_greeter DEFINITION PUBLIC FINAL ...
```

## Features

- Typed node factories for classes, interfaces, types, and statements
- Deterministic pretty-printer with ABAPDoc support
- Zero runtime dependencies

## Documentation

**[adt-cli.netlify.app/sdk/packages/abap-ast](https://adt-cli.netlify.app/sdk/packages/abap-ast)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
