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
