# Delta — `aclass` capability

## ADDED Requirements

### Requirement: Structural ABAP OO parsing

The parser SHALL recognise class and interface declarations — headers,
visibility sections, and member declarations (methods, attributes, types,
constants, events, aliases, interface statements) — including inheritance
and implements lists. Method implementation bodies SHALL be preserved as
opaque source slices with span information; statements inside a method
body SHALL NOT be parsed.

#### Scenario: Class definition round-trips through the AST

- **WHEN** a `.clas.abap` source containing sections and member
  declarations is parsed
- **THEN** the AST contains a `ClassDef` with typed `Section` and
  `ClassMember` nodes and each `MethodImpl` carries its raw body text
  and span

#### Scenario: Method body stays opaque

- **WHEN** a `METHOD <name>.` … `ENDMETHOD.` block is parsed
- **THEN** its statements are not interpreted and the raw slice is
  preserved byte-for-byte

### Requirement: Non-throwing parse contract

`parse()` SHALL return `{ ast, errors }` and SHALL NOT throw on malformed
input. Unrecoverable errors SHALL yield a best-effort AST for the portion
understood before the break, with lex and parse diagnostics reported as
`ParseError` entries carrying severity, line, column, and message.

#### Scenario: Malformed source returns diagnostics

- **WHEN** source containing a syntax error is parsed
- **THEN** the result contains a non-empty `errors` array and a partial
  AST, and no exception propagates

### Requirement: No runtime dependency on `@abapify/abap-ast`

The package SHALL NOT import `@abapify/abap-ast` in `src/**/*.ts`.
Shared shapes SHALL be re-declared locally; `abap-ast` is permitted only
as a devDependency for roundtrip tests.

#### Scenario: Runtime boundary enforced

- **WHEN** `packages/aclass/src/**/*.ts` is inspected
- **THEN** no import references `@abapify/abap-ast`

### Requirement: Chevrotain-based lexer and statement parser

Tokenisation SHALL use Chevrotain token definitions; no hand-rolled lexer
or regex-driven tokenizer is permitted. Keyword ordering SHALL place
compound keywords before their prefixes and `Identifier` last so keywords
win via `longer_alt`.

#### Scenario: Compound keyword tokenises correctly

- **WHEN** source contains `CLASS-DATA`
- **THEN** the lexer emits a single `ClassData` token rather than
  splitting at the hyphen
