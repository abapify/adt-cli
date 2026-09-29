## ADDED Requirements

### Requirement: Delegated assistants receive a server-owned read catalogue

The server SHALL accept an exact signed delegated-assistant policy bound to
one principal, thread, execution, System, and Destination. The resulting MCP
catalogue SHALL contain every registered tool whose server-owned operation
class is `server` or `read`.

#### Scenario: Delegated assistant lists tools

- **GIVEN** a valid delegated-assistant credential requests the read envelope
- **WHEN** the client calls `tools/list`
- **THEN** the server advertises multiple permitted read tools without a
  client-provided tool-name allowlist

#### Scenario: A new read tool is registered

- **GIVEN** a new tool has a complete `read` catalogue classification
- **WHEN** a delegated assistant refreshes `tools/list`
- **THEN** the new tool is admitted without changing the client credential
  contract

### Requirement: Delegated read authority cannot widen

The server SHALL reject malformed delegated-assistant policies and SHALL deny
`safe_execute`, `write`, unknown, and out-of-Destination operations at both
catalogue and dispatch.

#### Scenario: Delegated assistant attempts a write

- **WHEN** the client requests or directly calls a write-class tool
- **THEN** the tool is absent from discovery and dispatch returns
  `mcp_scope_denied` before a Destination lease or SAP operation

#### Scenario: Delegated policy carries additional authority

- **WHEN** the signed claim adds a tool list, resource override, non-empty
  limits, another operation class, or an additional Destination
- **THEN** the invocation exposes no MCP tools
