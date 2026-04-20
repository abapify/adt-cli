# abap-ast — AI Agent Guide

## Package Overview

**Zero-dependency typed AST + deterministic pretty-printer for ABAP.**
Emit-only. No parser (yet). Primary consumer:
[`@abapify/openai-codegen`](../openai-codegen).

| Item         | Value                                                 |
| ------------ | ----------------------------------------------------- |
| Dependencies | **None** (runtime). `vitest` + `tsdown` for dev only. |
| Language     | TypeScript 5 strict ESM                               |
| Build        | `bunx nx build abap-ast` (tsdown)                     |
| Test runner  | `bunx nx test abap-ast` (vitest, inline snapshots)    |
| Entry point  | `src/index.ts` — re-exports `./nodes` + `./printer`   |

## Architecture

```
Consumer code (openai-codegen, …)
  │  builds AbapNode tree using factory functions
  ▼
nodes/*.ts           (typed interfaces + factory functions, per-topic)
  │
  ▼
printer/index.ts     (print(node, options?): string)
  │   dispatches on node.kind
  ▼
printer/print-*.ts   (one module per topic, uses Writer)
  │
  ▼
printer/writer.ts    (buffered string writer — indent, keyword case, eol)
```

## Key Files

| File                       | Purpose                                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`             | Public barrel — re-exports nodes + printer.                                                                            |
| `src/nodes/index.ts`       | Re-exports all node modules in stable order.                                                                           |
| `src/nodes/base.ts`        | Shared types: `NodeKind`, `AbapNode`, `Visibility`, `Comment`.                                                         |
| `src/nodes/types.ts`       | Type nodes: `BuiltinType`, `NamedTypeRef`, `TableType`, `StructureType`, `EnumType`, `TypeDef`.                        |
| `src/nodes/data.ts`        | `DataDecl`, `ConstantDecl`, `FieldSymbolDecl`.                                                                         |
| `src/nodes/expressions.ts` | `Literal`, `IdentifierExpr`, `ConstructorExpr`, `MethodCallExpr`, `BinOp`, `StringTemplate`, `Cast`.                   |
| `src/nodes/statements.ts`  | Control flow + imperative forms (If, Loop, Try, Append, Read, …).                                                      |
| `src/nodes/members.ts`     | `MethodParam`, `MethodDef`, `MethodImpl`, `EventDef`, `AttributeDef`.                                                  |
| `src/nodes/class.ts`       | `Section`, `ClassDef`, `LocalClassDef`.                                                                                |
| `src/nodes/interface.ts`   | `InterfaceDef`.                                                                                                        |
| `src/nodes/errors.ts`      | `requireField()` — validator used by factories.                                                                        |
| `src/printer/index.ts`     | `print()` entry point + `kind` dispatch.                                                                               |
| `src/printer/writer.ts`    | Buffer + keyword-case + indent controller.                                                                             |
| `src/printer/options.ts`   | `PrintOptions`, `resolveOptions()`.                                                                                    |
| `src/printer/print-*.ts`   | Per-topic printer — pure functions on `(node, writer)`. Emits ABAPDoc `"! <line>` for `abapDoc`-carrying declarations. |

## Invariants

1. **`kind` is the PascalCase discriminant.** Every node has a string literal
   `kind` (`'ClassDef'`, `'MethodDef'`, …) matching the factory name. The
   printer dispatches on `kind` exclusively — never on `instanceof`.
2. **Factories validate and freeze.** `requireField()` enforces required
   inputs, unknown fields are dropped (TypeScript rejects them at the
   boundary), and the returned node is `Object.freeze`d. Consumers must not
   mutate nodes after construction.
3. **Printer is deterministic.** No `Math.random`, no `Date.now()`, no
   environment reads, no implicit sorting. Given the same AST + options, the
   output is byte-identical. This is enforced by snapshot tests.
4. **No implicit reordering.** Members, sections, parameters, statements,
   and type fields are printed in the exact order they appear in the tree.
   Sorting is a consumer concern.
5. **Internal nodes throw at the top level.** `Section`, `MethodParam`, and
   the bare type nodes (`BuiltinType`, `TableType`, `StructureType`,
   `EnumType`, `NamedTypeRef`) must be wrapped in their parent. `print()`
   throws with a clear message if called on them directly.
6. **No runtime dependencies.** This is a leaf package by design.
   Introducing any `dependencies` entry is a breaking architectural change.
7. **ABAPDoc is a readonly string array on declaration nodes.** `TypeDef`,
   `MethodDef`, `AttributeDef`, `InterfaceDef`, and `ClassDef` optionally
   carry `abapDoc: readonly string[]`. Each entry is one logical line;
   the printer emits `"! <line>` verbatim at the declaration's indent,
   immediately above the declaration. No escaping, no wrapping, no tag
   rewriting — consumers own their tag conventions. See
   `src/printer/print-members.ts`, `print-types.ts`, `print-class.ts`,
   `print-interface.ts`.

## Adding a New Node Kind

1. Pick the right topic module under `src/nodes/` (or create a new one and
   register it in `src/nodes/index.ts`).
2. Define the interface with a `kind: 'PascalName' extends NodeKind` literal.
3. Add the literal to `NodeKind` in `src/nodes/base.ts`.
4. Implement the factory — validate required fields via `requireField()`,
   return an `Object.freeze`d object.
5. Add a printer in `src/printer/print-*.ts` that takes
   `(node, writer: Writer)` and appends to the writer.
6. Wire the new `kind` into the `switch` in `src/printer/index.ts`.
7. Add a `vitest` snapshot in `tests/printer.test.ts` and a shape assertion
   in `tests/nodes.test.ts`.

## Testing Conventions

- Use **inline snapshots** (`toMatchInlineSnapshot`) for printer output —
  the snapshot IS the spec for the emitted ABAP.
- Snapshots must be valid ABAP. When in doubt, paste the output through
  `@abaplint/core` or a real SAP system before committing.
- `tests/printer.test.ts` is the end-to-end grid (types, expressions,
  statements, members, classes, interfaces, keyword case).
- `tests/nodes.test.ts` covers factory shape and `requireField` errors.

## Build Commands

```bash
bunx nx build abap-ast        # tsdown → dist/index.mjs (+ d.mts)
bunx nx test abap-ast         # vitest
bunx nx typecheck abap-ast    # tsc --noEmit
bunx nx lint abap-ast
```

## Known Gotchas

- **Star comments must start at column 1.** ABAP classifies `*` in column 1
  as a full-line comment; indented `*` is something else entirely. When
  splicing pre-formatted ABAP blocks into an indented context (see
  `sanitizeStarComments` in `@abapify/openai-codegen`), convert leading `*`
  to `"` so the resulting indent stays legal. The printer itself never
  produces indented star comments.
- **`Return` with a value emits two lines.** The conventional ABAP pattern is
  `rv = expr.` followed by `RETURN.`. The printer hard-codes the returning
  parameter name `rv` because there is no tree-wide context for the
  enclosing method's returning parameter. If your code uses a different
  name, assign to it explicitly before the bare `returnStmt()`.
- **`raw({ source })` is an escape hatch.** It writes its `source` verbatim,
  no indent adjustment, no keyword-case rewriting. Use sparingly.
