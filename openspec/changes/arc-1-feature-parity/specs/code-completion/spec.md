## ADDED Requirements

### Requirement: Request code completion proposals at cursor position

The system SHALL provide a `get_completions` MCP tool that requests ABAP code completion proposals at a given line/column cursor position from the ADT code-assistance endpoint (`/sap/bc/adt/codeassistance/completion`), returning a list of proposal items with their insert text and kind.

#### Scenario: Completions returned for partial symbol

- **WHEN** the user provides source code with cursor positioned after a partial symbol (e.g. `ZCL_OR`) and specifies `line` and `column`
- **THEN** the tool returns a list of completion proposals matching that prefix

#### Scenario: Empty completions list when no proposals available

- **WHEN** the cursor is positioned where the ADT server has no completion proposals
- **THEN** the tool returns an empty `proposals` list without error

#### Scenario: Tool returns error on BTP where endpoint unavailable

- **WHEN** the SAP system is a BTP ABAP Environment and the completion endpoint returns 404
- **THEN** the tool returns `isError: true` with a message indicating the endpoint is not available on this system

### Requirement: Completion requires cursor-position parameters

The tool SHALL require `objectName`, `objectType`, `line` (1-based), `column` (1-based), and optionally the `sourceCode` of the object as parameters.

#### Scenario: Missing line or column returns validation error

- **WHEN** the user calls `get_completions` without `line` or `column`
- **THEN** the tool returns a schema validation error before making any ADT call
