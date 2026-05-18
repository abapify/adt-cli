## ADDED Requirements

### Requirement: Retrieve ABAP runtime short dumps

The system SHALL provide a `get_short_dumps` MCP tool and `adt diagnose dumps` CLI command that retrieves recent ABAP runtime error short dumps from the SAP system via the ADT dumps endpoint (`/sap/bc/adt/runtime/dumps`).

#### Scenario: List recent short dumps

- **WHEN** the user calls `get_short_dumps` with no filters
- **THEN** the tool returns a list of short dumps ordered by timestamp descending, each containing at minimum: dump ID, error type, program name, user, timestamp

#### Scenario: Filter dumps by user

- **WHEN** the user provides a `user` parameter
- **THEN** only dumps owned by that SAP user are returned

#### Scenario: Limit results with maxResults

- **WHEN** the user provides `maxResults: 10`
- **THEN** at most 10 dump entries are returned

#### Scenario: Get dump detail by ID

- **WHEN** the user provides a specific `id` parameter
- **THEN** the full dump text is returned for that dump ID

#### Scenario: Endpoint unavailable on BTP returns informative error

- **WHEN** the SAP system is a BTP ABAP Environment and the dumps endpoint is unavailable
- **THEN** the tool returns `isError: true` with a message explaining the BTP limitation

### Requirement: CLI diagnose dumps command

The system SHALL expose `adt diagnose dumps [--user <user>] [--max <n>] [--id <dumpId>] [--json]` that lists or shows short dumps.

#### Scenario: CLI dumps command outputs list

- **WHEN** the user runs `adt diagnose dumps`
- **THEN** a table of recent dumps is printed to stdout

#### Scenario: CLI dumps --id shows full text

- **WHEN** the user runs `adt diagnose dumps --id <dumpId>`
- **THEN** the full dump analysis text is printed to stdout
