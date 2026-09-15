## ADDED Requirements

### Requirement: Typed transport metadata is available to automation

The system SHALL expose a read-only typed projection of a CTS request or task
that includes each returned unit's number, status, type, parent, owner,
description, and SAP last-change timestamp when SAP provides it.

#### Scenario: Request metadata includes child tasks

- **WHEN** a caller requests metadata for a CTS request that contains tasks
- **THEN** the result identifies the requested request and includes its request
  unit and child task units

### Requirement: CLI JSON stdout is machine-readable

The `adt cts tr metadata <transport> --json` command SHALL write exactly one
JSON document to stdout and SHALL write diagnostics only to stderr.

#### Scenario: Successful JSON invocation

- **WHEN** the command successfully reads a transport with `--json`
- **THEN** stdout can be parsed directly as the typed metadata result

### Requirement: MCP and CLI share metadata semantics

The system SHALL expose an MCP `cts_transport_metadata` tool that uses the
same metadata service as the CLI command.

#### Scenario: Equivalent read through MCP

- **WHEN** CLI and MCP query the same transport
- **THEN** they return equivalent requested transport and CTS unit metadata
