## Decision

The ADT client continues to decode SAP's generated typed transport contract.
`CtsTransportMetadataService` only projects that data; it performs no XML
parsing and has no Commander or MCP concerns. CLI and MCP are thin adapters over
the same service.

`--json` writes exactly one JSON document to stdout. Diagnostics are written to
stderr and failures set a non-zero exit status, so CI may parse stdout directly.

## Boundaries

The API is read-only. It does not release transports, select Git branches,
merge changes, or encode SAP XML. A caller requesting a task receives the task
as the primary unit; a caller requesting a request also receives its tasks.
