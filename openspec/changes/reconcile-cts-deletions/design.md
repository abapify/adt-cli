# Design

## Context

The dependency graph places format plugins and ADK manifest inventory below `adt-flow`; provider orchestration remains above it. Existing flow checkout has transactional repository mutation, object descriptors and one workspace lock. Reuse these primitives without changing checkout selection or adding a dependency on CLI/services/provider layers.

## Goals / Non-Goals

**Goals:** Prove direct or snapshot-backed CTS D operations independently of source exactness; delete only owned files; return deterministic, versioned outcomes; preserve unproven objects and historical evidence.

**Non-Goals:** SAP mutation, existence-based deletion, snapshot discovery, Git history or commit management, provider publication, automatic production adoption, CLI/MCP command additions, or materializing a component's containing source in this separate operation.

## Decisions

1. `createCtsDeletionProof(evidence)` validates the existing manifest inventory entry schema. Direct inventory must belong to the last requested task. Snapshot evidence requires a released task, a distinct same-system released transport of copies, one exact typed MERG origin and equal non-control inventory identities. Object-function differences are expected: a copied inventory can retain deletion operations missing from the original task. The proof retains declared operations and a canonical inventory digest.
2. Add `reconcileDeletions(input)` to the existing flow service. Revalidate evidence within the existing workspace lock. Derive owned files from valid indexed descriptors and the selected format's filename parser. Decode format namespace spelling; never maintain another object-type suffix table. Indexed hashes protect modified files. A package's generic `package.devc.xml` requires indexed ownership; folder names alone never authorize deleting package contents.
3. A whole-object operation produces `removed`, `already_absent` or `unapplied`, with exact paths and typed diagnostics. LIMU components require ordinary component checkout; this operation must not tombstone their owner. Unsupported types and ambiguous package ownership are explicit unapplied results. A dry run lists planned removals without writing source or descriptors.
4. Reuse safe regular-file reading and `applyRepositoryPlan` for source and tombstone changes in one transaction. Preserve binary bytes in snapshots. Update only the selected whole-object descriptor; retain transport inventory and its incomplete status. Return a source-free report; report persistence is the consumer's responsibility.
5. Library-first API only; no CLI/MCP parity surface changes. The consumer migration and fallback removal wait for exact packaged canary validation and separate accepted-source/stable delivery. Ordinary checkout is unchanged.

## Risks / Trade-offs

Legacy package ownership cannot always be reconstructed safely; preserve it with a diagnostic. Component deletion may require rewriting a shared owner file and belongs to existing checkout. The SDK lock serializes cooperating processes; callers must still isolate working trees from unrelated external writers and preserve report evidence. A snapshot proves selected CTS operations, not exact unavailable historical source versions.
