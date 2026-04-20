# @abapify/abap-ast

**Zero-dependency typed AST and deterministic pretty-printer for ABAP source code.**

## Overview

`@abapify/abap-ast` is the `ts.factory` of ABAP. It provides a typed node
model for ABAP classes, interfaces, types, statements, and expressions, plus
a single `print()` entry point that serialises any node to valid ABAP source.

There is **no parser (yet)** — this package is emit-only. A future `.aclass`
parser (e.g. Chevrotain-based) will produce the same AST, so code built on
top of this package stays forward-compatible.

Primary consumer: [`@abapify/openai-codegen`](../openai-codegen).

### What it gives you

- Typed factory functions for every node kind (classes, interfaces,
  methods, types, statements, expressions).
- A deterministic printer: identical input produces byte-identical output,
  across runs, platforms, and Node versions.
- Configurable keyword case, indent, and line ending.
- No runtime dependencies.

## Installation

```bash
bun add @abapify/abap-ast
```

## Quick Start

```typescript
import {
  print,
  classDef,
  section,
  typeDef,
  methodDef,
  methodImpl,
  methodParam,
  builtinType,
  returnStmt,
} from '@abapify/abap-ast';

const cls = classDef({
  name: 'zcl_greeter',
  isFinal: true,
  sections: [
    section({
      visibility: 'public',
      members: [
        typeDef({ name: 'ty_name', type: builtinType({ name: 'string' }) }),
        methodDef({
          name: 'greet',
          visibility: 'public',
          params: [
            methodParam({
              paramKind: 'importing',
              name: 'iv_name',
              typeRef: builtinType({ name: 'string' }),
            }),
            methodParam({
              paramKind: 'returning',
              name: 'rv_msg',
              typeRef: builtinType({ name: 'string' }),
            }),
          ],
        }),
      ],
    }),
  ],
  implementations: [methodImpl({ name: 'greet', body: [returnStmt()] })],
});

console.log(print(cls));
```

emits:

```abap
CLASS zcl_greeter DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    TYPES ty_name TYPE string.
    METHODS greet
      IMPORTING iv_name TYPE string
      RETURNING VALUE(rv_msg) TYPE string.
ENDCLASS.

CLASS zcl_greeter IMPLEMENTATION.
  METHOD greet.
    RETURN.
  ENDMETHOD.
ENDCLASS.
```

## Node kinds

Every node has a `kind: NodeKind` PascalCase discriminant. Nodes are grouped
by topic under `src/nodes/`; each module exports interfaces plus matching
factory functions. You rarely need the raw interfaces — the factories are
the public surface.

| Module           | Factories                                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `base.ts`        | `comment` (plus shared types: `NodeKind`, `Visibility`, `Identifier`)                                                                    |
| `types.ts`       | `builtinType`, `namedTypeRef`, `tableType`, `structureType`, `enumType`, `typeDef`                                                       |
| `data.ts`        | `dataDecl`, `constantDecl`, `fieldSymbolDecl`                                                                                            |
| `expressions.ts` | `literal`, `identifierExpr`, `constructorExpr`, `methodCallExpr`, `binOp`, `stringTemplate`, `cast`                                      |
| `statements.ts`  | `assign`, `call`, `raise`, `ifStmt`, `loop`, `returnStmt`, `tryStmt`, `append`, `insert`, `read`, `clear`, `exit`, `continueStmt`, `raw` |
| `members.ts`     | `methodParam`, `methodDef`, `methodImpl`, `eventDef`, `attributeDef`                                                                     |
| `class.ts`       | `section`, `classDef`, `localClassDef`                                                                                                   |
| `interface.ts`   | `interfaceDef`                                                                                                                           |

See [`src/nodes/`](src/nodes) for the full signatures — each factory is a
one-argument function taking a named-input object and returning a frozen
AST node.

`raw({ source })` is an escape hatch for ABAP fragments that are not yet
representable in the AST. Consumers should prefer structured nodes and
confine `raw` to known-safe cases (the inline runtime in
`@abapify/openai-codegen` uses it for hand-written HTTP/JSON helpers).

## Printer

```typescript
import { print, type PrintOptions } from '@abapify/abap-ast';

const source: string = print(node, options?);
```

| Option        | Type                 | Default   | Notes                                       |
| ------------- | -------------------- | --------- | ------------------------------------------- |
| `indent`      | `number`             | `2`       | Spaces per indentation level.               |
| `keywordCase` | `'upper' \| 'lower'` | `'upper'` | Case of ABAP keywords (`CLASS`, `METHODS`). |
| `eol`         | `string`             | `'\n'`    | Line ending (`'\r\n'` for CRLF output).     |

**Determinism guarantee.** For a given input tree and resolved options,
`print()` always returns the same string. The printer does no implicit
sorting, random id generation, or environment lookup. Snapshot-testing the
output is safe and is how this package is validated (see
`tests/printer.test.ts`).

The printer accepts most nodes at the top level, but a few internal nodes
(`Section`, `MethodParam`, and bare `TableType`/`StructureType` etc.) throw
if passed directly — wrap them in their enclosing node (`ClassDef`,
`MethodDef`, `TypeDef`) first.

## Design

This package deliberately mirrors the `ts.factory` pattern from the
TypeScript compiler API:

- The AST is the single source of truth for ABAP structure.
- Factories validate required fields at construction time and freeze the
  returned node.
- The printer is a pure function of the tree.
- No string concatenation leaks into consumer code — they always go through
  a typed factory.

A future `.aclass` Chevrotain parser will populate the same AST, at which
point `print(parse(src)) ≈ src` becomes the round-trip contract.

## Consumers

- [`@abapify/openai-codegen`](../openai-codegen) — OpenAPI → ABAP client
  generator. Builds a `ClassDef` per spec and relies on the determinism
  guarantee for reproducible artefacts.

## License

MIT
