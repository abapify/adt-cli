## Context

See `proposal.md`. Existing partial checkout already persists omitted-object
descriptors, but it also permits exact source materialization. Existing strict
checkout intentionally fails before all filesystem mutation. Neither surface
captures an unresolved boundary without changing source behavior.

## Goals / Non-Goals

**Goals:**

- Reuse the existing manifest, descriptor schemas, omission model, and shared
  flow service.
- Add one explicit source-free operation with matching CLI and MCP adapters.
- Preserve current strict and partial checkout semantics byte-for-byte.

**Non-Goals:**

- Reading, reconstructing, or writing source bodies.
- Git, CI, merge-request, transport-release, or vendor-specific workflow
  behavior.
- Treating an inexact object as materialized or exact.

## Decisions

### Use an explicit `index-only` operation rather than changing checkout defaults

The operation is opt-in because strict checkout's no-mutation guarantee is a
valuable safety boundary. Making partial checkout automatic would allow a
mixed transport to change source files while leaving unresolved components.
An index-only call makes the persistence intent visible and has no source-side
effect.

### Reuse the current manifest and omission descriptor formats

The service will build the same scoped manifest and apply existing selector
rules. It will create transport descriptors marked incomplete and omitted
descriptors only for entries that cannot be materialized. Exact entries remain
inventory-only until a normal checkout materializes them. This avoids a second
identity schema or source-resolution implementation.

### Expose thin CLI and MCP adapters over the public service

The CLI and MCP will parse the same explicit operation and delegate to the
same service result. They do not own persistence, SAP selection, or delivery
workflow, preserving the established parity boundary.

## Risks / Trade-offs

- An index can become stale after SAP history changes → normal checkout still
  rebuilds authoritative provenance and replaces incomplete state only after
  an exact result.
- Metadata selectors can require ADT metadata reads → bounded metadata reads
  are allowed; source reads remain forbidden.
- Consumers may mistake inventory for source → result and descriptor state
  identify omissions and the operation never reports source changes.

## Migration Plan

1. Release the additive service and adapter operation.
2. Consumers that need durable recovery state call index-only after a strict
   boundary failure, then persist the resulting `.adt` state outside source
   branches.
3. Roll back by stopping those calls; existing descriptors are safe to retain
   or delete and normal checkout behavior is unchanged.
