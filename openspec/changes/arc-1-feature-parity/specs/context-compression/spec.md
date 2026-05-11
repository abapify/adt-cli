## ADDED Requirements

### Requirement: Extract public API contracts from ABAP dependencies

The system SHALL provide a `get_context` MCP tool and `adt context` CLI command that, given an ABAP object, fetches its source and all detected custom dependencies, then strips each dependency to its **public API surface** only, returning a compact JSON payload.

Public API surface definition:

- **CLAS**: `CLASS DEFINITION … PUBLIC SECTION …  ENDCLASS.` — `PROTECTED`, `PRIVATE` sections and `CLASS IMPLEMENTATION` block are removed.
- **INTF**: Full interface source (interfaces are inherently public).
- **FUNC**: Function module signature only (`IMPORTING`, `EXPORTING`, `CHANGING`, `EXCEPTIONS` lines; function body removed).
- **DDLS (CDS view)**: Full DDL source of the view and all referenced data sources / associations (dependency graph).

#### Scenario: Get context for a class returns stripped dependencies

- **WHEN** the user calls `get_context` with `objectName: "ZCL_ORDER"` and `objectType: "CLAS"`
- **THEN** the response contains the public section of all detected Z/Y class and interface dependencies, not their implementations

#### Scenario: Implementation blocks are stripped

- **WHEN** a dependency class has a long `CLASS IMPLEMENTATION` block
- **THEN** that block is absent from the returned context payload

#### Scenario: SAP standard objects are excluded

- **WHEN** a class uses `CL_ABAP_*`, `IF_ABAP_*`, or `CX_SY_*` dependencies
- **THEN** those standard objects are NOT included in the context (only Z/Y custom objects are returned)

#### Scenario: AST parse failure falls back to full source

- **WHEN** `@abaplint/core` cannot parse a dependency (e.g. unusual macros)
- **THEN** the full unstripped source for that dependency is returned with a `fallback: true` flag

### Requirement: Dependency detection via AST

The system SHALL detect dependencies by parsing the source with `@abaplint/core` and identifying references from patterns including: `TYPE REF TO`, `NEW`, `CAST`, `INHERITING FROM`, `INTERFACES`, `CALL FUNCTION`, `RAISING`, `CATCH`, and static calls (`=>`).

#### Scenario: Class reference in method is detected

- **WHEN** a method body contains `lo_dep = NEW zcl_dep( )`
- **THEN** `ZCL_DEP` is included in the dependency set

#### Scenario: Interface in class definition is detected

- **WHEN** a class definition lists `INTERFACES: zif_something`
- **THEN** `ZIF_SOMETHING` is included in the dependency set

### Requirement: Configurable depth and max-deps limits

The system SHALL accept `maxDeps` (default 20) and `depth` (1 = direct only, max 3) parameters to prevent unbounded recursion on large dependency graphs.

#### Scenario: Depth 1 returns only direct dependencies

- **WHEN** `get_context` is called with `depth: 1`
- **THEN** only the immediate dependencies of the target object are included (not dependencies of dependencies)

#### Scenario: maxDeps cap is respected

- **WHEN** more dependencies are detected than `maxDeps`
- **THEN** the response is truncated at `maxDeps` entries and includes a `truncated: true` flag

### Requirement: CLI context command

The system SHALL expose `adt context <objectName> [--type <CLAS|INTF|PROG|DDLS>] [--depth <n>] [--max-deps <n>] [--json]` that prints the compressed context to stdout.

#### Scenario: CLI context outputs compressed JSON

- **WHEN** the user runs `adt context ZCL_ORDER --type CLAS`
- **THEN** the compressed dependency contracts are printed as JSON to stdout
