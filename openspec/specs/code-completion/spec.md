# code-completion Specification

## Purpose

ABAP code-completion proposals from the ADT code-assistance endpoint, exposed as the `get_completions` MCP tool.

## Requirements

### Requirement: Request code completion proposals at cursor position

The system SHALL provide a `get_completions` MCP tool that requests ABAP code completion proposals at a given line/column cursor position from the ADT code-assistance endpoint (`/sap/bc/adt/codeassistance/completion`), returning the endpoint's response payload serialized as JSON. Response normalization (guaranteeing a `proposals` list with `insertText`/`kind` on every item) is not implemented and is tracked as follow-up work.

#### Scenario: Completions returned for partial symbol

- **WHEN** the user provides source code with cursor positioned after a partial symbol (e.g. `ZCL_OR`) and specifies `line` and `column`
- **THEN** the tool returns the backend completion response for that position

#### Scenario: Backend response is passed through unchanged

- **WHEN** the ADT endpoint returns a response — with or without a `proposals` list
- **THEN** the tool serializes that response as-is, without adding or normalizing fields

#### Scenario: Tool returns error on BTP where endpoint unavailable

- **WHEN** the SAP system is a BTP ABAP Environment and the completion endpoint returns 404
- **THEN** the tool returns `isError: true` with a message indicating the endpoint is not available on this system

### Requirement: Completion requires cursor-position parameters

The tool SHALL require `objectName`, `objectType`, `line` (1-based), `column` (1-based), and optionally the `sourceCode` of the object as parameters.

#### Scenario: Missing line or column returns validation error

- **WHEN** the user calls `get_completions` without `line` or `column`
- **THEN** the tool returns a schema validation error before making any ADT call
