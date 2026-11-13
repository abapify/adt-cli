# Proposal

## Why

Explicit CTS deletion and partial source coverage are independent facts. Consumers currently validate deletion snapshots and remove serialized files outside the SDK, duplicating transport and format semantics. Existing flow checkout already supplies ownership descriptors, repository transactions and locks, but has no public operation to reconcile a proven deletion inventory independently of source acquisition.

## What Changes

Add a typed deletion-evidence builder and an explicit library-only `reconcileDeletions` flow-service operation. Validate direct latest-task inventory or a released transport-of-copies snapshot with exact origin and inventory binding. Resolve owned serialized files, preserve ambiguous ownership, update whole-object tombstones and return a versioned per-operation report. Reuse the existing workspace lock, path validation and transactional repository apply. No implicit metadata-404 deletion, SAP writes or change to ordinary checkout behavior.

## Capabilities

### New Capabilities

- `adt-flow-cts-deletions`: Proven CTS deletion reconciliation and structured applied/absent/unapplied results.

### Modified Capabilities

None. Existing `adt-flow-checkout` component-preservation and strict checkout contracts remain unchanged.

## Impact

Additive APIs in `@abapify/adt-flow`, synthetic source-tree tests and documentation. No new dependency, command, MCP tool or provider integration. Consumers adopt only after packaged canary validation; production fallback removal and eventual stable adoption are separate delivery operations. Rollback leaves ordinary checkout and existing consumers unchanged.
