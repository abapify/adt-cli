# acds - AI Agent Guide

## Package Overview

**ABAP CDS source parser** — tokenizes, parses, and produces a typed AST from `.acds` DDL source code.

| Feature            | Description                                          |
| ------------------ | ---------------------------------------------------- |
| **Chevrotain**     | Lexer + CstParser + visitor pattern                  |
| **Error recovery** | Returns partial AST + structured errors              |
| **Phase 1**        | TABL, Structure, DRTY, SRVD, DDLX                   |
| **Single export**  | `parse(source) → { ast, errors }`                    |

## Architecture

```
Source string
  → CdsLexer        (tokens.ts)    Tokenize
  → CdsParser       (parser.ts)    Tokens → CST
  → CdsVisitor      (visitor.ts)   CST → AST
  → CdsSourceFile   (ast.ts)       Typed AST
```

### Key Files

| File          | Purpose                                      |
| ------------- | -------------------------------------------- |
| `src/index.ts`   | `parse()` entry point, re-exports all types  |
| `src/tokens.ts`  | Chevrotain token definitions (keywords, symbols, literals) |
| `src/parser.ts`  | Grammar rules (`CdsParser` extends `CstParser`) |
| `src/visitor.ts` | CST → AST transformation (`CdsVisitor`)      |
| `src/ast.ts`     | AST node interfaces and union types          |
| `src/errors.ts`  | Error normalization (lex errors + parse errors) |

### AST Node Hierarchy

```
CdsSourceFile
  └── CdsDefinition (union)
        ├── TableDefinition      (kind: 'table')
        ├── StructureDefinition  (kind: 'structure')
        ├── SimpleTypeDefinition (kind: 'simpleType')
        ├── ServiceDefinition    (kind: 'service')
        ├── MetadataExtension    (kind: 'metadataExtension')
        ├── RoleDefinition       (kind: 'role')          — Phase 2
        └── ViewEntityDefinition (kind: 'viewEntity')    — Phase 3

TableMember = FieldDefinition | IncludeDirective
TypeRef     = BuiltinTypeRef  | NamedTypeRef
```

## Conventions

### Token Order Matters

In `tokens.ts`, **keywords must come before `Identifier`** in the `allTokens` array. Keywords use `longer_alt: Identifier` to avoid matching identifier prefixes.

### Adding a New Keyword

1. Create token with `longer_alt: Identifier` in `tokens.ts`
2. Add to `allTokens` array **before** `Identifier`
3. If the keyword can appear as a name, add it to the `cdsName` rule in `parser.ts`
4. Import the token in `parser.ts`

### Parser Rules

- The parser uses `recoveryEnabled: true` — malformed input produces partial CST + errors
- `maxLookahead: 3` — keep grammar LL(3) compatible
- The singleton `cdsParser` instance is reused across calls (set `.input` before parsing)

### Visitor Pattern

- `CdsVisitor` extends the auto-generated `BaseCstVisitor` from Chevrotain
- Each parser rule has a matching visitor method
- Visitor methods return typed AST nodes; the visitor is validated at construction

### Adding a New Definition Type

1. Add AST interface to `ast.ts` with a `kind` literal discriminant
2. Add to `CdsDefinition` union type
3. Add grammar rules to `parser.ts`
4. Add visitor methods to `visitor.ts`
5. Re-export the type from `index.ts`
6. Add test cases to `parser.test.ts`

## Consumer

This package is consumed by `@abapify/adt-plugin-abapgit`:

- `cds-to-abapgit.ts` — imports AST types (`TableDefinition`, `FieldDefinition`, etc.) to map CDS AST → DD02V/DD03P structures
- `objects/tabl.ts` — calls `parse()` on CDS source to produce abapGit XML

## Testing

```bash
bunx nx test acds
```

Tests live in `src/parser.test.ts` and cover:
- Table definitions (key fields, annotations, decimal types, includes, builtin types)
- Structure definitions
- Simple type definitions (builtin + named)
- Service definitions (expose with/without alias)
- Metadata extensions (annotated elements)
- Annotation values (string, enum, boolean, number, array)
- Comments (line + block)
- Error handling (invalid + incomplete input)

## Dependencies

- [`chevrotain`](https://chevrotain.io/) — Parser toolkit

## Reference

- [README.md](./README.md) — Full API reference
- [adt-plugin-abapgit](../adt-plugin-abapgit/AGENTS.md) — Primary consumer
