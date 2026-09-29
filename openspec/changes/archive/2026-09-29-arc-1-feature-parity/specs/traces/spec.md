## ADDED Requirements

### Requirement: Retrieve ABAP performance traces

The system SHALL provide a `get_traces` MCP tool and `adt diagnose traces` CLI command that retrieves ABAP performance trace data from the SAP system via the ADT traces endpoint (`/sap/bc/adt/runtime/traces`).

#### Scenario: List available traces

- **WHEN** the user calls `get_traces` with `action: "list"`
- **THEN** the tool returns available trace records with ID, user, program, creation timestamp

#### Scenario: Get trace hitlist

- **WHEN** the user calls `get_traces` with `action: "hitlist"` and a specific trace `id`
- **THEN** the tool returns the hitlist (hot-spot statements ranked by gross time)

#### Scenario: Get trace DB accesses

- **WHEN** the user calls `get_traces` with `action: "dbAccesses"` and a specific trace `id`
- **THEN** the tool returns the database access statistics for that trace

#### Scenario: Endpoint unavailable on BTP returns informative error

- **WHEN** the SAP system is a BTP ABAP Environment and the traces endpoint is unavailable
- **THEN** the tool returns `isError: true` with a message explaining the BTP limitation

### Requirement: CLI diagnose traces command

The system SHALL expose `adt diagnose traces [list|hitlist|db] [--id <traceId>] [--json]` that retrieves trace data from SAP.

#### Scenario: CLI traces list outputs available traces

- **WHEN** the user runs `adt diagnose traces list`
- **THEN** a list of available traces is printed to stdout
