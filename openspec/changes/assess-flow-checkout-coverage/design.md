## Context

The first increment (`expose-flow-checkout-report`) extracted typed report
builders. Consumers still classify completeness themselves (the ACR
import-completeness adapter is 1100+ lines), and the SDK cannot prove that a
persisted report still describes the reviewed tree.

## Goals / Non-Goals

- Goals: one pure function binding report + descriptors + file evidence into
  a versioned, deterministic assessment; explicit `unknown` for missing or
  unsupported reports; typed omissions instead of implicit classification.
- Non-Goals: no filesystem or Git access, no report storage, no CLI/MCP
  command changes, no SAP acquisition, no policy decisions about review
  publication.

## Decisions

### One discriminated assessment result

`assessFlowCheckoutCoverage` returns either an explicit `unknown` assessment
(`missing-report` / `unsupported-report`) or a validated assessment. Missing
or malformed evidence degrades to omissions or `unknown`, never to `complete`.

### Validation reuses the established descriptor rules

Descriptors parse through `objectDescriptorSchema`; duplicate owned paths
throw `path_collision` and paths outside `src/` throw `path_invalid`, matching
`assessFlowIndexReconciliation`. Inventory entries reuse the manifest entry
schema.

### Evidence is caller-supplied and hash-based

The caller verifies bytes (or explicit absence with `null`) exactly like the
index reconciliation boundary. The assessment never reads the filesystem, so
a report-storage failure is the caller's boundary: it passes a missing report
and receives `unknown`.

### Classification is omission-driven

`complete` requires: no typed omissions, no unverified owned files, and no
divergence; anything else is `partial`. The assessment reports facts
(`acquired` / `deleted` / `unverified` file lists, inventory mapping counts)
without making review-policy decisions.

## Risks / Trade-offs

- A pure evidence-based contract requires callers to hash files; consumers
  that cannot hash keep using the report builders alone.
- The assessment does not validate Git history; the caller retains that
  boundary as documented in the module.

## Migration Plan

Additive only. Existing report builders and CLI storage stay unchanged;
consumers adopt the assessment incrementally.
