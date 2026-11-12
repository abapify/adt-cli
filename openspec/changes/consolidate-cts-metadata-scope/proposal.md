## Why

Consumers still parse CTS XML and re-implement request/task metadata, release ordering and control-entry handling outside the SDK. The typed metadata projection exists (`CtsTransportMetadataService`), but generic request/task normalization and ordered multi-root scope planning are missing, so every consumer duplicates them with subtly different behavior.

## What Changes

- Expose pure, generic request/task normalization on top of the existing transport metadata projection: preserve parent/task identity, raw CTS inventory, object functions, release timestamps, owner resolution and unsupported entries as facts.
- Expose ordered multi-root scope planning: given several requested transports and their metadata, produce a deterministic plan that expands requests into task scopes, deduplicates identities, and keeps duplicate identities honest instead of silently merging them.
- Keep repository naming, business-ticket extraction, eligibility policy and CI serialization in consumer adapters — they are policies, not SDK facts.
- Existing public metadata behavior remains compatible; no consumer cutover in this increment.

## Impact

- Affected specs: `adt-cts-metadata` (new capability)
- Affected code: `packages/adt-services` (new pure module + exports + fixtures), tests only otherwise.
- No command or MCP surface is added in this increment; new user-facing commands require CLI/MCP parity tests and are follow-up work.
- Dependencies: coordinates with the snapshot-report work item; does not gate metadata parsing on report availability.
