---
title: '@abapify/adt-flow'
description: 'Incremental transport source-tree materialization for ADT'
---

# `@abapify/adt-flow`

Incremental transport source-tree materialization for ADT

## Install

```bash
bun add @abapify/adt-flow @abapify/adt-plugin @abapify/adt-plugin-abapgit
```

## Transport source checkout

If diagnostic report storage fails after checkout or an index-only fallback, the CLI warns
with `INVENTORY_REPORT_UNAVAILABLE` and keeps the available sources. Consumers
must treat the missing fresh report as unknown completeness. This does not
suppress checkout failures, unsafe report paths, or the existing required
`--partial-report` contract. An index-only fallback is reported explicitly as
inventory indexing without source materialization, including when report storage fails.

Class components with ADT subtypes `CLAS/OC`, `CLAS/OSU`, `CLAS/OM` resolve to
their full `R3TR CLAS` owner and use ordinary class source/abapGit materialization.

To persist only transport inventory and unresolved-boundary descriptors under
`.adt`, without fetching or materializing source, use the explicit index-only
command. Validation of existing ownership may read local source files and reject
modified or unreadable files:

```text
adt flow index tr DEVK900001,DEVK900002
```

`checkout` remains strict: if any versioned component has no exact source
boundary, it fails without changing the workspace. `checkout --partial` is a
separate explicit opt-in that materializes only exact components. `index` never
materializes source; it retains the complete transport inventory. In head mode,
unresolved objects receive one `omitted` descriptor per object identity for a
later retry, unless a prior non-omitted descriptor is preserved and its ownership
validated. Partial checkout can create a `present` descriptor for exact
selections while reporting other components of that object as omitted.

Automation that must preserve an inexact transport for a later retry can opt
into `adt flow checkout tr <transport> --index-on-inexact`. Only the typed
`manifest_inexact` outcome falls back to source-free indexing; every other
checkout error remains fail-closed.

```typescript
import {
  createAdtFlowService,
  createAdtFlowDependencies,
} from '@abapify/adt-flow';
import { getFormatPlugin } from '@abapify/adt-plugin';
import '@abapify/adt-plugin-abapgit';

// client is an already authenticated ADT client.
// Importing @abapify/adt-plugin-abapgit registers its format plugin.
const registeredFormatPlugin = getFormatPlugin('abapgit');
if (!registeredFormatPlugin) {
  throw new Error('abapGit format plugin is not registered.');
}

const flow = createAdtFlowService(
  createAdtFlowDependencies(client, registeredFormatPlugin),
);

await flow.checkout({
  root: process.cwd(),
  transports: ['DEVK900001'],
  mode: 'base',
  config: {
    format: { id: 'abapgit', options: { folderLogic: 'prefix' } },
    include: { objectTypes: ['CLAS', 'INTF'] },
  },
});

await flow.index({
  root: process.cwd(),
  transports: ['DEVK900001'],
  config: {
    format: { id: 'abapgit', options: { folderLogic: 'prefix' } },
    include: { objectTypes: ['CLAS', 'INTF'] },
  },
});
```

The service invokes no Git command. It reconciles format-owned files and
deterministic descriptors under `.adt`, rejects unowned collisions or modified
indexed files before mutation, and attempts rollback after a failed multi-file apply.
Rollback can also fail, leaving a partially changed workspace; the error reports
that the complete previous tree could not be restored.
Branches, commits, routing, and merge requests remain the caller's concern.

`.adt/tr/<transport>.json` is emitted for every request/task discovered during
head checkout. Each transport descriptor retains the complete CTS object
inventory, including unsupported or currently filtered types. Object descriptors
under `.adt/objects/` are written for both base and head. Object
descriptors use `.adt/objects/<TYPE>/<unique-name>.<type>.adt.json`. The index
stores hashes and immutable version identities, never source bodies or
credentials. In an explicit partial checkout, an object that cannot be
materialized still receives an `omitted` descriptor with its identity and
component diagnostic, but no owned files or source selection. Removing `.adt`
only removes the optimization; source selection continues to come from the
supplied SAP manifest operation.

Exactness applies to versioned source components. Metadata files describe the
object metadata available at checkout time; flow does not reconstruct historical
metadata or replicate repository history.

## Source

- Source: [`packages/adt-flow`](https://github.com/abapify/adt-cli/blob/main/packages/adt-flow)
- README: [`packages/adt-flow/README.md`](https://github.com/abapify/adt-cli/blob/main/packages/adt-flow/README.md)

## Proven CTS deletions (library API)

`createCtsDeletionProof(evidence)` validates explicit CTS D operations without
loading source. Evidence is either the latest task's structured inventory or a
released transport-of-copies snapshot bound to that task by typed origin and
matching non-control inventory. Missing source, metadata 404 and timestamps do
not authorize deletion. The version-one proof records selected scope, declared
operations, snapshot identity and a canonical inventory digest.

Use `createAdtFlowService(dependencies).reconcileDeletions({ root, config,
evidence, dryRun })` to apply the proof using the selected format, existing
workspace lock and repository transaction. The operation makes no SAP calls.
Whole-object ownership comes from indexed descriptors and the format filename
parser. Indexed hashes protect modified files; owned class companions move to
the same deleted boundary. Package deletion removes owned metadata only and
preserves child source. Unindexed generic package metadata requires additional
ownership evidence and is preserved.

The version-one result contains `proof`, `operations`, `planned`, `removed` and
`dryRun`. Each operation reports `removed`, `already_absent`, `unapplied` or
`planned`, with exact paths, indexed already-absent paths and a typed diagnostic.
Components that require ordinary owner-source checkout remain `unapplied`;
a component declaration cannot delete its containing object. Dry run reports
planned paths without removing files or writing object tombstones.

The caller must isolate the workspace at the selected task's intended head and
retain the returned report alongside its source-acquisition diagnostics. A
deletion proof is not proof of complete or exact historical source coverage.
Independently reconciled tombstones require an inventory refresh before any
exact-head cache reuse; historical transport inventory remains unchanged.
Report persistence and nonblocking reviewer presentation remain consumer
responsibilities. Ordinary checkout and CLI/MCP surfaces are unchanged.
