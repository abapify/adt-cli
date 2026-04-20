# Delta — `abap-ast` capability (new)

## ADDED Requirements

### Requirement: Typed AST nodes for ABAP

`@abapify/abap-ast` SHALL expose typed factory functions for constructing ABAP program structure (classes, interfaces, types, methods, parameters, data declarations, statements, expressions, comments) as a pure TypeScript value graph.

#### Scenario: Building a class AST

- **WHEN** `classDef({ name: 'ZCL_FOO', isFinal: true, sections: [...] })` is called
- **THEN** the returned value is a typed `ClassDef` node whose fields are statically checked by TypeScript and whose shape is documented by the exported type.

### Requirement: Deterministic pretty-printing

The package SHALL expose a `print(node): string` function whose output is stable across machines and runs: 2-space indent, keywords upper-cased, identifiers preserved, declarations ordered by declaration index (no implicit sorting), and no trailing whitespace.

#### Scenario: Snapshot stability

- **GIVEN** a fixed AST graph constructed from the same factory calls
- **WHEN** `print(ast)` is called on two different machines
- **THEN** both outputs are byte-identical.

### Requirement: Zero runtime dependencies

`@abapify/abap-ast` SHALL have zero runtime dependencies and be consumable from any TypeScript 5 ESM environment.

#### Scenario: Installing standalone

- **WHEN** the package is installed outside this monorepo into a vanilla `bun init` project
- **THEN** it resolves with no `dependencies` entries and exposes working `classDef` / `print` imports.

### Requirement: ABAPDoc comments on declarations

Declaration nodes (`TypeDef`, `MethodDef`, `AttributeDef`, `InterfaceDef`, `ClassDef`) SHALL support an optional `readonly abapDoc: readonly string[]` field. When present, the printer SHALL emit each line verbatim with a `"! ` prefix at the declaration's indentation, immediately before the declaration itself.

#### Scenario: Single-line ABAPDoc

- **GIVEN** a `TypeDef` node constructed with `abapDoc: ['@openapi-schema Pet']`
- **WHEN** `print(node)` is called
- **THEN** the output begins with the line `"! @openapi-schema Pet` followed by the `TYPES:` declaration on the next line at the same indentation.

#### Scenario: Multi-line ABAPDoc

- **GIVEN** a `MethodDef` node with `abapDoc: ['@openapi-operation findPetsByStatus', '@openapi-path GET /pet/findByStatus']`
- **WHEN** `print(node)` is called
- **THEN** the output contains both lines in order, each prefixed with `"! `, immediately preceding the `METHODS` declaration.

#### Scenario: Empty or missing ABAPDoc

- **GIVEN** a declaration node with `abapDoc` absent or set to `[]`
- **WHEN** `print(node)` is called
- **THEN** no `"! ` comment line is emitted for that declaration.
