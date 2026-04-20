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

## See also

- [`acds`](./acds) — ABAP CDS parser (also uses Chevrotain; will share
  conventions with the future `.aclass` parser).
- [`adt-codegen`](./adt-codegen) — hook-based generator for ADT
  artefacts (TypeScript output, unrelated pipeline).
