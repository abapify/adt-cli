## Why

Automation consumers need CTS release ordering and eligibility fields that the
legacy transport summary omits. Reading raw `adt fetch` stdout is unsafe because
the CLI renders progress UI there, and consumer-owned XML parsing duplicates SAP
protocol handling.

## What Changes

- Add `adt cts tr metadata <transport> --json`, a stdout-clean typed metadata
  projection for a request or task and its child tasks.
- Add matching `cts_transport_metadata` MCP read tool.
- Preserve number, parent, owner, description, status, type, and SAP
  `lastchanged_timestamp` in a shared service result.

## Impact

Affected packages: `adt-client`, `adt-cli`, and `adt-mcp`. This is additive;
existing commands remain unchanged. Consumers can migrate away from raw XML
without credentials or consumer-specific SAP endpoint code.
