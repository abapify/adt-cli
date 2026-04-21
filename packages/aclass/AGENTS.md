# aclass - AI Agent Guide

## Package Overview

**ABAP OO source parser** — tokenises and parses `.clas.abap` /
`.intf.abap` source files into a typed AST. Scope is strictly
structural: class / interface headers, sections, and member
declarations. Method bodies are preserved as opaque source slices;
their statements are NOT parsed in this package.

Symmetric to `@abapify/acds` (CDS parser) and the reverse direction of
`@abapify/abap-ast` (ABAP emitter). All three packages can interlock
into a full ABAP OO round-trip:

```
.clas.abap / .intf.abap
  → aclass lexer + parser + visitor      ← this package
  → typed AST
  → abap-ast printer
  → .clas.abap / .intf.abap              (roundtrip invariant: bytes match)
```

## Current status

Waves 0–3 are all shipped:

- **Wave 0** — Chevrotain lexer (`tokens.ts`) with compound-keyword and
  ABAPDoc handling.
- **Wave 1** — statement-based parser (`parser.ts`) + typed AST
  (`ast.ts`). No Chevrotain CstParser / visitor — ABAP's `keyword … dot`
  statement shape makes a statement splitter both simpler and more
  robust than a full CST pipeline for this scope.
- **Wave 2** — fixture suite against the live petstore3 corpus and
  structural roundtrip / idempotence tests.
- **Wave 3** — consumer wiring via `assertCleanParse()` (`assert.ts`),
  used by `@abapify/openai-codegen` as a CI gate.

See
[`openspec/changes/add-aclass-parser/tasks.md`](../../openspec/changes/add-aclass-parser/tasks.md)
for the detailed task record.

## Architecture

```
Source string (.clas.abap / .intf.abap)
  → AclassLexer    (src/tokens.ts)    Tokenise
  → statement split (on `Dot`)         Declarative-statement stream
  → parse()         (src/parser.ts)    Typed AST
  → AbapSourceFile  (src/ast.ts)       { definitions, source }
  → assertCleanParse (src/assert.ts)   Consumer CI gate
```

Why a statement splitter, not a Chevrotain CstParser: ABAP is
`keyword … dot` at the surface level. Declaring every production in
Chevrotain would require also declaring the expression grammar just
to parse type references — and method bodies are explicitly opaque in
this package, so the expression grammar would be wasted. The
statement splitter classifies each statement by its head keyword and
builds typed AST nodes directly from the token slice; unknown shapes
fall through to `RawMember` for lossless roundtrip.

### Key files

| File            | Purpose                                                                        |
| --------------- | ------------------------------------------------------------------------------ |
| `src/index.ts`  | Public exports: `parse`, `assertCleanParse`, AST types, lexer, token types.    |
| `src/tokens.ts` | Chevrotain token definitions (keywords, symbols, literals, comments).          |
| `src/lex.ts`    | `tokenize(source)` — thin wrapper that normalises lex errors.                  |
| `src/errors.ts` | Chevrotain lex + parse errors → stable `ParseError` shape.                     |
| `src/parser.ts` | Statement splitter + per-statement typed AST builders.                         |
| `src/ast.ts`    | AST node interfaces.                                                           |
| `src/assert.ts` | `assertCleanParse(source, fileLabel)` + `AclassParseError` — reusable CI gate. |

## Conventions

### Token order matters

1. Compound keywords (`CLASS-DATA`, `CLASS-METHODS`, `CLASS-EVENTS`,
   `NON-UNIQUE`, `READ-ONLY`) MUST be declared **before** their
   prefixes in `allTokens`, otherwise the lexer splits them at the
   hyphen.
2. `INTERFACES` (plural, member keyword) MUST come **before**
   `INTERFACE` (definition keyword). This matters because
   `INTERFACES zif_foo.` would otherwise match `INTERFACE` and leave
   `S zif_foo.` in the stream.
3. `ABAPDocLine` (`"! …`) MUST come **before** `LineComment` (`" …`)
   so documentation lines are captured rather than skipped.
4. Multi-char symbols (`=>`, `->`, `::`) MUST come before their
   single-char prefixes.
5. `Identifier` MUST be declared last among word-shaped tokens so
   all keywords win via `longer_alt: Identifier`.

### Case-insensitive

ABAP is case-insensitive. Every keyword uses a `/i` regex; the lexer
matches `CLASS`, `Class`, and `class` as the same token. Callers who
need the original casing read it from the token's `image` property.

### `"` prefix is a comment, NOT a string

Single-quoted strings use `'…'`. `"…` is a line comment, and `"! …`
is ABAPDoc. This differs from most languages and is the reason
`ABAPDocLine` and `LineComment` live in the lexer, not the parser.

### Star comments only at column 1

A literal `*` at column 1 starts a full-line comment (legacy
convention). Mid-line `*` is NOT a comment; the lexer uses a custom
pattern with `line_breaks: false` that rejects offsets where the
preceding character isn't a newline.

## Commands

```bash
bunx nx test aclass        # Vitest
bunx nx build aclass       # tsdown
bunx nx typecheck aclass   # tsc --noEmit
bunx nx lint aclass        # ESLint
```

## Anti-patterns to avoid

| Don't                                    | Do instead                                          |
| ---------------------------------------- | --------------------------------------------------- |
| Hand-rolled string scanning              | Extend `allTokens`                                  |
| Add `then` property on AST nodes         | Use `thenBody` (JS thenable clash — see `abap-ast`) |
| Depend on `@abapify/abap-ast` at runtime | Devdep only; aclass owns its AST                    |
| `throw` on malformed input               | Return `{ ast, errors }`                            |
