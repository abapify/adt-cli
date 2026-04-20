# Add ABAP OO parser (`@abapify/aclass`)

## Why

`@abapify/abap-ast` already emits typed ABAP classes and interfaces, and
`@abapify/acds` parses CDS source into a typed AST. The missing piece is the
**reverse direction for ABAP OO**: read existing `.clas.abap` / `.intf.abap`
source back into an AST so downstream tools can inspect, modify, and re-emit
it.

Concrete drivers:

- **Round-trip codegen.** We want to prove (and guard via test) that
  `print(parse(generated))` reproduces the bytes `@abapify/openai-codegen`
  emits. Today there is no parser, so the generator's output contract is
  only guarded by snapshot tests. A round-trip test closes the loop.
- **ADT read-back.** `@abapify/adt-client` can download the active source
  of any class/interface. Higher-level tooling (refactoring, analysis,
  diffs) needs typed access to the declarations — signatures, types,
  attributes — not just string-level diffs.
- **`adt-plugin-abapgit` consumer.** The abapGit serializer already owns
  handlers that decide _which_ file goes where. A typed parser lets those
  handlers reason about _what_ is in the file (test class? behaviour
  pool? abstract class?) from the source itself instead of relying on
  XML-side `VSEOCLASS.CATEGORY` alone.

Symmetric to `acds` for CDS sources, `aclass` for ABAP OO sources.

## What Changes

New package:

- **`@abapify/aclass`** — Chevrotain-based parser that reads
  `.clas.abap` and `.intf.abap` source files and yields a typed AST of
  the **structural** declarations (class/interface headers, sections,
  method/attribute/event/type/alias declarations, inheritance, implements).
  Method _bodies_ are preserved as an opaque source slice (start/end
  offset + raw text). Top-level statements (DATA/TYPES outside classes)
  are NOT in scope.

The chosen AST mirrors `@abapify/abap-ast` node shapes where they overlap
(`ClassDef`, `InterfaceDef`, `Section`, `MethodDef`, `AttributeDef`,
`TypeDef`, `MethodParam`, `TypeRef`, ABAPDoc lines). Nodes that only make
sense in parsed source (source-position slices, trailing comments,
`MethodImpl` raw body) live on `aclass` types and may be converted into
`abap-ast` nodes when that is lossless.

New AST usages unlocked by parsing:

- `print(parse(src))` round-trip test for every file that
  `openai-codegen` emits today.
- "What is the signature of method X in this class?" without calling ADT.
- Refactoring primitives (rename method, add parameter, replace
  RAISING clause) become straightforward tree transforms.

### What this PR adds (scope of the first change)

1. `packages/aclass/` package skeleton (package.json, tsconfig, eslint
   config, tsdown config, vitest config), wired into `nx` like `acds`.
2. **Lexer** — a single `tokens.ts` file defining the ABAP token set
   needed for class/interface headers: keywords (`CLASS`, `INTERFACE`,
   `DEFINITION`, `IMPLEMENTATION`, `PUBLIC`/`PROTECTED`/`PRIVATE`,
   `SECTION`, `METHODS`, `CLASS-METHODS`, `DATA`, `CLASS-DATA`, `TYPES`,
   `CONSTANTS`, `EVENTS`, `CLASS-EVENTS`, `ALIASES`, `INTERFACES`,
   `INHERITING`, `FROM`, `FOR`, `TESTING`, `RISK`, `LEVEL`, `DURATION`,
   `FINAL`, `ABSTRACT`, `CREATE`, `IMPORTING`, `EXPORTING`, `CHANGING`,
   `RETURNING`, `RAISING`, `TYPE`, `REF`, `TO`, `REDEFINITION`,
   `OPTIONAL`, `DEFAULT`, `VALUE`, `BEGIN`, `END`, `OF`, `STANDARD`,
   `SORTED`, `HASHED`, `TABLE`, `STRUCTURE`, `WITH`, `KEY`, `EMPTY`,
   `UNIQUE`, `NON-UNIQUE`), identifiers, string literals, integer
   literals, `ABAPDocLine` (`"!`), line comments (`"`), star comments
   (`*`), end-of-statement dot, comma, colon, paren open/close,
   backtick literal, hyphen, whitespace.
3. **Parser** — a Chevrotain `CstParser` with production rules limited
   to: `cdsClassDef`, `cdsClassImplementation`, `cdsInterfaceDef`, each
   broken down into sections, member declarations, inheritance /
   `IMPLEMENTS` lists. Method implementations (`METHOD foo. … ENDMETHOD.`)
   are captured as a single _opaque_ node whose body is the raw text
   between `METHOD <name>.` and `ENDMETHOD.`. `maxLookahead: 4`,
   `recoveryEnabled: true`, following `acds`.
4. **Visitor** — CST → typed AST. Emits `AbapSourceFile` with a single
   top-level `definitions: AbapDefinition[]` array, each element a
   `ClassDef`, `ClassImpl`, or `InterfaceDef`.
5. **Error normalization** — Chevrotain lex + parse errors mapped to a
   stable `{ line, column, message, severity: 'error' }` shape.
6. **Public API** — one entry point:
   `parse(source: string): { ast: AbapSourceFile; errors: ParseError[] }`.
   Export all AST node types.
7. **Tests (vitest)** —
   - `tests/grammar/class-header.test.ts` — every class-header variant
     the printer emits: plain, `FINAL`, `ABSTRACT`, `INHERITING FROM`,
     `CREATE PRIVATE`, `FOR TESTING RISK LEVEL HARMLESS DURATION SHORT`.
   - `tests/grammar/sections.test.ts` — three sections in any order,
     empty sections, `PROTECTED` allowed to be missing.
   - `tests/grammar/methods.test.ts` — `METHODS foo.`,
     `METHODS foo RETURNING VALUE(r) TYPE string RAISING zcx_bar.`,
     importing/exporting/changing/returning/raising mixes,
     `REDEFINITION`, `ABSTRACT`, `FOR TESTING`.
   - `tests/grammar/data-types-aliases.test.ts` — `DATA`,
     `CLASS-DATA`, `CONSTANTS`, `TYPES BEGIN OF / END OF`,
     `ALIASES x FOR zif_y~x`, `INTERFACES zif_z.`, `EVENTS`.
   - `tests/grammar/interface.test.ts` — bare interface, interface
     with methods / events / aliases / types.
   - `tests/fixtures/` + `tests/fixtures.test.ts` — every
     `*.clas.abap` / `*.intf.abap` file under
     `samples/petstore3-client/generated/abapgit/src/` parses without
     errors and yields a non-empty AST with at least one top-level
     definition.
   - `tests/roundtrip.test.ts` — **the invariant test**. For every
     fixture, `print(parse(src).ast) === src` (modulo whitespace /
     trailing blank lines). Uses `@abapify/abap-ast` as the renderer
     so this test also doubles as a coverage check on the printer
     against real generator output.
8. **Dependencies** — `chevrotain` (peer of `acds` already), no
   `@abapify/abap-ast` runtime import inside the parser (kept as
   devDependency for the roundtrip test only, to avoid a circular
   dep between `aclass ⇄ abap-ast`). `aclass` publishes its own AST
   types; a converter `toAbapAst(node)` / `fromAbapAst(node)` may land
   in a later PR.

### Out of scope (explicitly deferred)

- Parsing of method bodies beyond raw text capture. A downstream
  expression parser can consume the captured slice later.
- Global (non-class) DATA/TYPES declarations, FORM/PERFORM, old-style
  reports, function pools. Classic on-prem ABAP constructs don't
  affect today's codegen output.
- SELECT / UPDATE / INSERT / MODIFY / COMMIT statement parsing.
- Macros (`DEFINE / END-OF-DEFINITION`), includes (`INCLUDE zX.`).
- CDS annotations embedded in class source.
- AST walker helpers (`walkDefinitions`, `walkMembers`, …) — will
  follow once the core parser is stable and has consumers.
- Semantic validators (is the super-class visible, is the aliased
  interface implemented). The parser only guarantees well-formedness
  of the surface syntax it covers.

## Impact

- **Affected specs**: new `aclass` spec under
  `openspec/changes/add-aclass-parser/specs/aclass/spec.md`, created
  by this change.
- **Affected code**:
  - **Added**: `packages/aclass/` package (sources, tests, configs,
    README, AGENTS.md).
  - **Added**: nx registration (`nx.json` / `tsconfig.base.json`
    paths) — same pattern used for `acds` and `abap-ast`.
  - **Not modified**: no existing package depends on `aclass` in
    this change. `@abapify/openai-codegen` will pick it up in a
    follow-up change that adds the round-trip test from the
    generator side.

## Out of scope for this proposal but tracked

- `walkDefinitions` / `walkMembers` tree traversal helpers (mirror
  `acds` walker).
- Converters `aclass → @abapify/abap-ast` (push) and
  `@abapify/abap-ast → aclass` (pull) for lossless round-tripping
  when the two ASTs diverge.
- CLI (`bunx aclass parse zcl_foo.clas.abap`) — low priority, only
  useful for debugging.
- Error-recovery tests (partial parse still yields useful AST).
