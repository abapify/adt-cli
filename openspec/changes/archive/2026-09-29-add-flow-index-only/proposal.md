## Why

Transport history can prove that an object cannot yet be materialized without
making the transport itself disappear from local recovery state. Callers need
to retain a safe, source-free inventory of that fact while keeping normal
checkout fail-closed and non-mutating.

## What Changes

- Add an explicit, vendor-neutral `adt-flow` index-only operation for a
  transport scope.
- Persist deterministic `.adt` transport inventory and omission descriptors
  without reading source bodies or changing format-owned source files.
- Expose the same operation through the flow CLI and MCP adapters, using the
  shared service result and bounded diagnostics.
- Preserve existing checkout semantics: strict checkout still rejects an
  inexact boundary before filesystem mutation, and partial checkout remains an
  explicit source-materialization mode.

## Capabilities

### New Capabilities

- `adt-flow-index-only`: Persist source-free transport inventory and
  non-materializable object diagnostics independently from source checkout.

### Modified Capabilities

- None.

## Impact

- Affected packages: `@abapify/adt-flow`, `@abapify/adt-cli`, and
  `@abapify/adt-mcp`.
- Additive public API and command/tool surface; no dependency, release, or
  transport-system specific behavior.
- Rollback consists of removing the additive command/tool and its descriptors;
  existing checkout and source files are unaffected.
