## 1. Prerequisite and contract tests

- [x] 1.1 Confirm `add-exact-source-history` is present on the public upstream baseline.
- [x] 1.2 Add failing contract tests across `adt-plugin` and the abapGit adapter for pure desired-tree materialization, explicit source overrides, deterministic output, and unsupported capability diagnostics.
- [x] 1.3 Add failing `adt-config` schema/type tests for the deterministic `flow` format, selectors, and concurrency bounds.
- [x] 1.4 Define versioned transport/object descriptor schemas in `adt-flow` and add parse, normalization, unsafe-name encoding, and forward-version rejection tests.

## 2. Format materialization boundary

- [x] 2.1 Add the optional desired-tree materialization types and capability to `adt-plugin` without changing legacy import/export contracts.
- [x] 2.2 Refactor the abapGit serializer so registered handlers can consume explicit source-component overrides without mutable-source reads.
- [x] 2.3 Implement pure abapGit path/content materialization using existing folder logic and handler schemas, with no filesystem or ADT operations.
- [x] 2.4 Add abapGit tests for INTF and composite CLAS outputs, component roles, folder logic, deterministic ordering, unsupported sources, and legacy API compatibility.

## 3. `adt-flow` selection and indexing

- [x] 3.1 Scaffold public `@abapify/adt-flow` with service, schemas, command export, build configuration, and only the required public-package dependencies.
- [x] 3.2 Implement transport normalization, relevance filtering, and composition of `buildTransportSourceManifest` without duplicating source-history logic.
- [x] 3.3 Implement lazy selected-source reads so only changed base/head component bodies are fetched after manifest validation.
- [x] 3.4 Implement deterministic `.adt/tr` and `.adt/objects` read/write models with config/format digests, version identities, owned paths, SHA-256 hashes, and deletion tombstones.
- [x] 3.5 Implement the exact-repeat head zero-SAP-call fast path and the base/head per-component no-body-read fast path, with tests that assert call counts and zero writes.
- [x] 3.6 Prove transport descriptors first appear on successful head checkout, while base writes only present predecessor object descriptors and does not pre-create new-object identities.
- [x] 3.7 Add tests proving deletion of `.adt` changes call counts but not the materialized source result.
- [x] 3.8 Exclude the non-source `R3TR SUSK` CTS authorization-maintenance entry before source-history retrieval, with a manifest regression test.

## 4. Safe repository reconciliation

- [x] 4.1 Implement format-recognizable file discovery and canonical object ownership adoption for repositories without descriptors.
- [x] 4.2 Implement desired/current tree planning for create, update, package-path move, deletion, and no-op outcomes.
- [x] 4.3 Reject path traversal, portable case collisions, duplicate ownership, unowned destination collisions, and indexed hash divergence before writes.
- [x] 4.4 Implement staged apply and rollback in `applyRepositoryPlan`, snapshotting touched files and restoring them on failure.
  - [ ] 4.4.1 Add fault-injection tests proving failures never report success for a partial tree.
- [x] 4.5 Add end-to-end filesystem fixtures proving modified objects are not pseudo-created and first-observed deletions produce file removals.

## 5. CLI and configuration delivery

- [x] 5.1 Implement typed `flow` configuration loading for one active abapGit format, AND-composed relevance selectors, and bounded concurrency.
- [x] 5.2 Implement the nested `flow checkout tr` command plugin with comma-separated scope, boolean `--base`, current-directory target, JSON-safe result, and bounded diagnostics.
- [x] 5.3 Add command tests for head/base argument mapping, missing config, bounded failures, and absence of plan/Git behavior.
- [x] 5.4 Document minimal `adt.config.ts` setup, base/head invocation, external commit ownership, descriptor behavior, and source-only exactness.

## 6. MCP parity

- [x] 6.1 Add `flow_checkout_tr` in `adt-mcp` with transport scope, optional base mode, explicit workspace-root confinement, and filesystem-mutation annotations.
- [x] 6.2 Delegate the MCP tool directly to the same `adt-flow` service operation and exclude source bodies from structured results and errors.
- [ ] 6.3 Add CLI/MCP parity tests proving equivalent arguments, materialization summaries, diagnostics, and repository trees over the same fixtures.

## 7. Performance and verification gates

- [ ] 7.1 Add request-count benchmarks for cold base, indexed base, sequential head, exact repeat, expanded config, and a large synthetic transport under bounded concurrency.
- [x] 7.2 Run targeted unit tests and direct TypeScript checks for `adt-plugin`, `adt-plugin-abapgit`, `adt-config`, `adk`, `adt-flow`, and `adt-mcp`.
- [x] 7.3 Restore or diagnose the Nx plugin-worker gate, then run affected Nx test, typecheck, lint, format, and build targets; record any verified baseline failures separately.
- [x] 7.4 Run `openspec validate add-adt-flow-transport-checkout --strict` and `git diff --check`.
- [ ] 7.5 After ADT authentication, perform one smallest read-only released-transport capability probe and one bounded checkout smoke test, recording only identities, counts, statuses, timings, and hashes.
- [x] 7.6 Verify the public branch contains no consumer-specific issue IDs, system names, product references, credentials, agent attribution, or non-public author email before any public push.

## 8. Follow up on parent-attributed sequential tasks

- [x] 8.1 Add a failing indexed-flow test proving an `added` parent-boundary manifest preserves the prior task state in base mode.
- [x] 8.2 Reuse the verified present descriptor and owned files as the incremental base without source or mutable-state reads.
- [x] 8.3 Prove an unindexed format-recognizable tree remains unchanged in base mode and is adopted by head checkout.

## 9. Preserve complete CTS inventory for later materialization

- [x] 9.1 Add failing tests proving selector-excluded and unsupported CTS objects remain in the manifest inventory.
- [x] 9.2 Persist one `.adt/tr/<TR>.json` descriptor per discovered request/task with concrete object provenance.
- [x] 9.3 Resolve supported LIMU leaves through their `wbtype` and ADT owner URI while preserving the original CTS identity.
- [x] 9.4 Prove an inventory-only task survives the consumer's state-only publication path and can be retried after support expands (covered by the downstream consumer regression).
