# Tasks — `@abapify/aclass`

## Wave 0 — skeleton + lexer (first PR)

1. [x] Scaffold `packages/aclass/` (package.json, tsconfig, tsdown.config.ts, vitest.config.ts, eslint.config.js, project.json for Nx) mirroring `packages/acds/`.
2. [x] Wire `@abapify/aclass` into `tsconfig.base.json` paths and the root workspace `package.json` workspaces array.
3. [x] Write `src/tokens.ts` — Chevrotain token definitions for the ABAP OO subset listed in the spec. Keyword order must put longer keywords before their prefixes (`INTERFACES` before `INTERFACE`, `CLASS-DATA` before `CLASS`, `NON-UNIQUE` before `UNIQUE`) so the lexer doesn't split them.
4. [x] Add `src/tokens.test.ts` — tokenise a minimal `CLASS zcl_x DEFINITION PUBLIC FINAL. PUBLIC SECTION. METHODS foo. ENDCLASS.` string and assert the expected token stream.
5. [x] Add `packages/aclass/AGENTS.md` copied from `packages/acds/AGENTS.md` and adapted for ABAP.
6. [x] Add root `AGENTS.md` entry under "On Demand" rules.

## Wave 1 — parser + visitor (second PR)

1. [x] Write `src/parser.ts` — Chevrotain `CstParser` with rules `sourceFile`, `classDef`, `classImpl`, `interfaceDef`, `section`, `classMember`, `methodDecl`, `attributeDecl`, `typeDecl`, `constantDecl`, `eventDecl`, `aliasDecl`, `interfaceStmt`, `methodImpl`, `typeRef`, `paramList`, `param`, `excList`, `abapDocLine`.
2. [x] Write `src/ast.ts` — TypeScript interfaces for every node kind in the spec's AST shape section.
3. [x] Write `src/visitor.ts` — CST → typed AST. Preserves `SourceSpan` for every node (derive from Chevrotain token offsets).
4. [x] Write `src/errors.ts` — normalise Chevrotain lex + parse errors into `ParseError`.
5. [x] Write `src/index.ts` — export `parse(source)`, all AST interfaces, `ParseError`.
6. [x] Grammar tests: `tests/grammar/class-header.test.ts`, `tests/grammar/sections.test.ts`, `tests/grammar/methods.test.ts`, `tests/grammar/data-types-aliases.test.ts`, `tests/grammar/interface.test.ts`.

## Wave 2 — fixtures + roundtrip (third PR)

1. [x] Copy every `.clas.abap` / `.intf.abap` from `samples/petstore3-client/generated/abapgit/src/` into `packages/aclass/tests/fixtures/petstore3/` (as the baseline corpus; frozen copy).
2. [x] Add three hand-crafted edge-case fixtures: `abstract-class.clas.abap`, `event-interface.intf.abap`, `nested-types.clas.abap`.
3. [x] `tests/fixtures.test.ts` — every fixture parses without errors and yields ≥ 1 top-level definition.
4. [x] `tests/roundtrip.test.ts` — for every fixture, assert `abapAstPrint(parse(src).ast) === src` modulo whitespace. Use `@abapify/abap-ast` as a devDependency (not runtime).
5. [x] Add `tests/roundtrip.helpers.ts` with a `toAbapAst(node)` converter for aclass nodes that don't map one-to-one (e.g. `MethodImpl.body` → `raw({ source: body })`).
6. [x] Release gates: run `nx test aclass`, `nx lint aclass`, `nx typecheck aclass`, `nx build aclass`. All green.

## Wave 3 — documentation + consumer wiring (fourth PR, optional)

1. [x] Add a roundtrip CI test inside `openai-codegen` that depends on `aclass` and parses every newly-generated file (catches AST regressions).
2. [x] `packages/aclass/README.md` with usage examples.
3. [x] Update website docs (`website/site-docs/sdk/packages/aclass.md`).
4. [x] Archive this change under `openspec/archive/add-aclass-parser/` once all waves merged.

## Definition of done

A change lands when:

1. Every fixture parses cleanly and roundtrip-matches byte-for-byte
   (modulo whitespace) the original source.
2. `abap-ast` never needs to be changed to accommodate the parser —
   if parser emits a shape `abap-ast` can't render, the AST is
   extended on the parser side only.
3. `@abapify/aclass` has zero `@abapify/abap-ast` imports in
   `src/**/*.ts` (runtime boundary); only `tests/**/*.ts` are
   permitted to depend on `abap-ast`.
