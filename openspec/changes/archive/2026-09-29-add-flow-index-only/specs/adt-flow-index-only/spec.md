## Purpose

Provide a durable, source-free record of transport inventory and unresolved
source boundaries without weakening exact source checkout guarantees.

## ADDED Requirements

### Requirement: Flow can index a transport without materializing source

`adt-flow` SHALL provide an explicit index-only operation for a transport scope
that persists deterministic `.adt` transport and object descriptors without
reading source bodies or changing format-owned source paths.

#### Scenario: Inexact source boundary is indexed

- **GIVEN** a transport contains a relevant object whose source boundary is
  inexact
- **WHEN** an index-only operation is requested for that transport
- **THEN** the transport inventory and an omitted-object descriptor retain the
  object identity, component, source transport, and bounded diagnostic
- **THEN** no source body is read and no format-owned source path is changed

#### Scenario: Exact source remains unmaterialized during indexing

- **GIVEN** a transport contains an exact source component
- **WHEN** an index-only operation is requested
- **THEN** the transport inventory is persisted without selecting or writing
  the component's source files

#### Scenario: Normal checkout remains strict

- **GIVEN** a transport contains a relevant object whose source boundary is
  inexact
- **WHEN** normal checkout is requested without the index-only operation
- **THEN** checkout fails with its typed bounded diagnostic before any
  repository path is changed

### Requirement: Index-only flow is available through equivalent adapters

The CLI and MCP flow adapters SHALL expose the same explicit index-only
operation and SHALL return equivalent structured results without source bodies
or credentials.

#### Scenario: CLI and MCP index the same fixture

- **GIVEN** the CLI and MCP receive the same flow configuration, transport
  manifest, and repository tree
- **WHEN** each requests index-only flow for the transport
- **THEN** both return equivalent inventory, descriptor, and omission results
- **THEN** neither changes format-owned source paths
