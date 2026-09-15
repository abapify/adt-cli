## Why

Transport review currently serializes the mutable SAP object state. An object
that already existed before the reviewed transport can therefore appear newly
created, while a first observed deletion can disappear from the review
entirely. Review needs a repository tree for the selected transport boundary:
the source immediately before it and the source introduced by it.

## What Changes

- Add public `@abapify/adt-flow` orchestration with the command
  `adt flow checkout tr <TR[,TR...]> [--base]`.
- Add the required MCP twin over the same public service and structured result;
  neither delivery adapter owns checkout logic.
- Materialize the selected transport's exact source boundary into the current
  repository tree: `--base` selects the version before the earliest in-scope
  change; the default selects the newest in-scope version.
- Reconcile desired files with the local tree, including creation, update,
  move, and deletion, without invoking Git or owning branches, commits,
  routing, merge requests, or business workflows.
- Add deterministic `.adt/tr/<TR>.json` and
  `.adt/objects/<TYPE>/<encoded-name>.<type>.adt.json` descriptors as an optional,
  committed incremental index. Head checkout writes the reviewed transport
  descriptor for every discovered request/task and retains the complete CTS
  object inventory, including objects not yet supported by the active format.
  Base checkout writes predecessor object descriptors. Removing
  `.adt` affects performance, not source selection correctness.
- Add a pure format-materialization extension to `@abapify/adt-plugin` and an
  abapGit implementation. The MVP supports only abapGit output while keeping
  the boundary open to other formats.
- Add a typed `flow` section to root `adt.config.ts` for relevant object types,
  packages, application components, format, and bounded concurrency.
- Fail closed before filesystem mutation when the source boundary is
  ambiguous or failed, or when paths collide or diverge from indexed state;
  record and skip unsupported object types so exact source components in the
  same transport remain reviewable and the skipped inventory can be retried
  when support is added.
- Explicitly limit MVP exactness to versioned source components. Full history
  replication and reconstruction of historical object metadata are deferred.

## Capabilities

### New Capabilities

- `adt-flow-transport-checkout`: source-exact transport-boundary selection,
  incremental descriptors, configuration filtering, and safe repository-tree
  reconciliation.
- `format-tree-materialization`: format-neutral production of desired object
  files with source overrides and no direct filesystem mutation.

### Modified Capabilities

- `adt-cli`: exposes matching CLI and MCP delivery surfaces through the
  existing command-plugin and service-parity conventions.

## Impact

- **Affected packages**: new `adt-flow`; additive changes to `adt-plugin`,
  `adt-plugin-abapgit`, `adt-config`, `adt-mcp`, and CLI/MCP parity tests.
- **Reused capability**: `buildTransportSourceManifest` and immutable reads from
  the active `add-exact-source-history` change. This proposal MUST NOT
  duplicate transport/source-history selection.
- **Dependencies**: `adt-flow` depends on public ADK, client, config, and plugin
  contracts, but not on `adt-cli`, Git libraries, databases,
  consumer-specific services, or platform-specific APIs.
- **Compatibility**: additive APIs and command only. Existing import/export
  commands keep their semantics.
- **Rollback**: remove the `flow` section from `adt.config.ts` and remove the
  additive package/contracts. Existing repository files remain valid abapGit files;
  `.adt` descriptors can be deleted safely.

## Preconditions and Evidence

- The active exact-source-history implementation already selects the newest
  in-scope source and the version immediately older than the oldest in-scope
  source per component, including deletion diagnostics.
- Targeted source-history tests pass (34 tests across ADK and CLI services),
  and direct TypeScript checks pass for ADK, plugin, and abapGit packages.
- Affected Nx test, build, and lint targets run successfully. The full MCP test
  suite has three failures that reproduce unchanged on the committed baseline;
  the focused flow MCP tests pass.
- The exact-source-history prerequisite is present on public upstream.
- Live release-compatibility claims still require bounded read-only evidence
  from explicitly configured SAP destinations; fixtures alone are insufficient.
