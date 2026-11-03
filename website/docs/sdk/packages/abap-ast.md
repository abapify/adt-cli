---
title: '@abapify/abap-ast'
description: Zero-dependency typed AST and deterministic pretty-printer for ABAP.
---

# @abapify/abap-ast

Zero-dependency, strictly-typed AST nodes and a deterministic pretty-printer
for ABAP. Think of it as a small `ts.factory` for ABAP: every node is built
through a validating factory, every field is `readonly`, and `print()` turns
a tree into source code that is stable byte-for-byte across runs.

No parser (yet) — emission only. The package is the foundation for
deterministic code generators such as
[`@abapify/openai-codegen`](./openai-codegen).

## Install

```bash
bun add @abapify/abap-ast
```

## Public API

```ts
export {
  // Printer
  print,
  printInlineType,
  printExpression,
  Writer,
  type PrintOptions,
  // Node factories (selection)
  classDef,
  localClassDef,
  section,
  typeDef,
  builtinType,
  namedTypeRef,
  tableType,
  structureType,
  enumType,
  methodDef,
  methodImpl,
  methodParam,
  attributeDef,
  constantDecl,
  eventDef,
  interfaceDef,
  // Error
  AbapAstError,
} from '@abapify/abap-ast';
```

## Quick start

```ts
import {
  print,
  classDef,
  section,
  typeDef,
  builtinType,
  methodDef,
  methodParam,
} from '@abapify/abap-ast';

const cls = classDef({
  name: 'zcl_hello',
  sections: [
    section({
      visibility: 'public',
      members: [
        typeDef({ name: 'ty_id', type: builtinType({ name: 'string' }) }),
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
              name: 'rv_text',
              typeRef: builtinType({ name: 'string' }),
            }),
          ],
        }),
      ],
    }),
  ],
});

console.log(print(cls));
```

produces:

```abap
CLASS zcl_hello DEFINITION PUBLIC CREATE PUBLIC.
  PUBLIC SECTION.
    TYPES ty_id TYPE string.
    METHODS greet
      IMPORTING iv_name TYPE string
      RETURNING VALUE(rv_text) TYPE string.
ENDCLASS.

CLASS zcl_hello IMPLEMENTATION.
ENDCLASS.
```

## Node families

AST node definitions are grouped by concern under `src/nodes/`:

| File             | Nodes                                                                              |
| ---------------- | ---------------------------------------------------------------------------------- |
| `base.ts`        | `AbapNode`, `Identifier`, `Visibility`                                             |
| `types.ts`       | `BuiltinType`, `NamedTypeRef`, `TableType`, `StructureType`, `EnumType`, `TypeDef` |
| `data.ts`        | `DataDecl`, `FieldSymbolDecl`, `ConstantDecl`                                      |
| `expressions.ts` | `Literal`, `Identifier`, `MethodCall`, operator expressions                        |
| `statements.ts`  | Control flow, assignments, comments                                                |
| `members.ts`     | `MethodParam`, `MethodDef`, `MethodImpl`, `AttributeDef`, `EventDef`               |
| `class.ts`       | `ClassDef`, `LocalClassDef`, `Section`                                             |
| `interface.ts`   | `InterfaceDef`                                                                     |
| `errors.ts`      | `AbapAstError` (thrown by every factory on invalid input)                          |

Every factory validates its inputs (e.g. a method with a `RETURNING`
parameter cannot also declare `EXPORTING`/`CHANGING`, a class cannot be
both `FINAL` and `ABSTRACT`, a section's members must match its
visibility), throws `AbapAstError`, and freezes the resulting node. Arrays
are frozen too — the AST is effectively immutable.

## ABAPDoc comments

Declaration nodes (`TypeDef`, `MethodDef`, `AttributeDef`, `InterfaceDef`,
`ClassDef`) accept an optional `abapDoc: readonly string[]` field. The
printer emits each entry as a `"! <line>` comment at the declaration's
own indentation, immediately above the declaration. Consumers use this
to attach structured, round-trip metadata (for example the
`@openapi-operation`, `@openapi-path`, `@openapi-schema`, and
`@openapi-ref` markers emitted by
[`@abapify/openai-codegen`](./openai-codegen)).

```ts
import { print, methodDef, methodParam, builtinType } from '@abapify/abap-ast';

const m = methodDef({
  name: 'get_foo',
  visibility: 'public',
  abapDoc: ['@openapi-operation getFoo', 'Return a foo.'],
  params: [
    methodParam({
      paramKind: 'importing',
      name: 'id',
      typeRef: builtinType({ name: 'string' }),
    }),
  ],
});

console.log(print(m));
```

emits:

```abap
"! @openapi-operation getFoo
"! Return a foo.
METHODS get_foo
  IMPORTING id TYPE string.
```

Lines are written verbatim — no wrapping, no escaping, no tag rewriting.

## `print()` and options

```ts
print(node: AbapNode, options?: PrintOptions): string

interface PrintOptions {
  indent?: number;           // spaces per level, default 2
  keywordCase?: 'upper' | 'lower'; // default 'upper'
  eol?: string;              // default '\n'
}
```

`print()` accepts top-level nodes: `ClassDef`, `LocalClassDef`,
`InterfaceDef`, `TypeDef`, member-level nodes (`AttributeDef`,
`MethodDef`, `MethodImpl`, `EventDef`, `ConstantDecl`), statements and
expressions. Inline type references and expressions are also exported as
`printInlineType()` and `printExpression()` for embedding into other
generators.

### Determinism guarantee

`print()` is a pure function of its inputs — no file I/O, no timestamps,
no hashing of unrelated data. Given the same AST and the same options it
returns the same string on every invocation, on every platform. Ordering
is preserved exactly as declared: sections appear in the order they were
passed, members in the order they were added to the section, parameters
in the order given to `methodDef`. Downstream code generators rely on
this property to produce diff-stable output.

## Design note: `ts.factory` for ABAP

The shape of the API intentionally mirrors TypeScript's compiler factory
(`ts.factory.createClassDeclaration`, etc.) — a set of small, typed,
validating builders that compose into a tree, and a single printer that
turns the tree back into source. This pattern makes code generation
mechanical and testable: generators build trees, tests compare strings.

A **future `.aclass` Chevrotain parser** (tracked as a follow-up) can
target the same AST definitions without any change to the printer or the
factories. That symmetry — parse to AST, transform AST, print AST — is
what the node shapes were designed for.

## Consumers

- [`@abapify/openai-codegen`](./openai-codegen) — OpenAPI → ABAP class
  code generator. Builds a `ClassDef` (plus any auxiliary `LocalClassDef`
  for exception types) and calls `print()`.

## Overview

`@abapify/abap-ast` is the `ts.factory` of ABAP. It provides a typed node
model for ABAP classes, interfaces, types, statements, and expressions, plus
a single `print()` entry point that serialises any node to valid ABAP source.

There is **no parser (yet)** — this package is emit-only. A future `.aclass`
parser (e.g. Chevrotain-based) will produce the same AST, so code built on
top of this package stays forward-compatible.

Primary consumer: [`@abapify/openai-codegen`](https://github.com/abapify/adt-cli/blob/main/packages/openai-codegen).

### What it gives you

- Typed factory functions for every node kind (classes, interfaces,
  methods, types, statements, expressions).
- A deterministic printer: identical input produces byte-identical output,
  across runs, platforms, and Node versions.
- Configurable keyword case, indent, and line ending.
- No runtime dependencies.

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

See [`src/nodes/`](https://github.com/abapify/adt-cli/blob/main/packages/abap-ast/src/nodes) for the full signatures — each factory is a
one-argument function taking a named-input object and returning a frozen
AST node.

`raw({ source })` is an escape hatch for ABAP fragments that are not yet
representable in the AST. Consumers should prefer structured nodes and
confine `raw` to known-safe cases.

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

## See also

- [`acds`](./acds) — ABAP CDS parser (also uses Chevrotain; will share
  conventions with the future `.aclass` parser).
- [`adt-codegen`](./adt-codegen) — hook-based generator for ADT
  artefacts (TypeScript output, unrelated pipeline).
