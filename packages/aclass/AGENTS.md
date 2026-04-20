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

Wave 0 (this commit): lexer (`tokens.ts`), error shape, `tokenize()`
entry point and 12 smoke tests covering compound keywords, ABAPDoc vs
regular line comments, star-comments at column 1, access operators,
and qualified references.

Wave 1 onwards: CstParser, visitor, typed AST, per-topic grammar
tests. Wave 2 adds the petstore3 fixture suite and the roundtrip
release gate. See
[`openspec/changes/add-aclass-parser/tasks.md`](../../openspec/changes/add-aclass-parser/tasks.md)
for the full wave plan.

## Architecture

```
Source string (.clas.abap / .intf.abap)
  → AclassLexer   (src/tokens.ts)    Tokenise
  → AclassParser  (src/parser.ts)    Tokens → CST     [Wave 1]
  → AclassVisitor (src/visitor.ts)   CST → typed AST  [Wave 1]
  → AbapSourceFile (src/ast.ts)                       [Wave 1]
```

### Key files

| File             | Purpose                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `src/index.ts`   | Public exports. Re-exports `tokenize`, lexer, token types, error shape. |
| `src/tokens.ts`  | Chevrotain token definitions (keywords, symbols, literals, comments).   |
| `src/lex.ts`     | `tokenize(source)` — thin wrapper that normalises lex errors.           |
| `src/errors.ts`  | Chevrotain lex + parse errors → stable `ParseError` shape.              |
| `src/parser.ts`  | [Wave 1] CstParser rules.                                               |
| `src/visitor.ts` | [Wave 1] CST → typed AST.                                               |
| `src/ast.ts`     | [Wave 1] AST node interfaces.                                           |

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

| Don't                                    | Do instead                                                  |
| ---------------------------------------- | ----------------------------------------------------------- |
| Hand-rolled string scanning              | Extend `allTokens`                                          |
| `new RegExp(...)` for each keyword match | `createToken({ pattern: /word/i, longer_alt: Identifier })` |
| Add `then` property on AST nodes         | Use `thenBody` (JS thenable clash — see `abap-ast`)         |
| Depend on `@abapify/abap-ast` at runtime | Devdep only; aclass owns its AST                            |
| `throw` on malformed input               | Return `{ ast, errors }`                                    |
