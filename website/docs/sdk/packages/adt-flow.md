---
title: '@abapify/adt-flow'
description: 'Incremental transport source-tree materialization for ADT'
---

# `@abapify/adt-flow`

Incremental transport source-tree materialization for ADT

## Install

```bash
bun add @abapify/adt-flow
```

## Transport source checkout

If diagnostic report storage fails after a successful checkout, the CLI warns
with `INVENTORY_REPORT_UNAVAILABLE` and keeps the available sources. Consumers
must treat the missing fresh report as unknown completeness. This does not
suppress checkout failures, unsafe report paths, or the existing required
`--partial-report` contract.

Class components with ADT subtypes `CLAS/OC`, `CLAS/OSU`, `CLAS/OM` resolve to
their full `R3TR CLAS` owner and use ordinary class source/abapGit materialization.

To persist only transport inventory and unresolved-boundary descriptors under
`.adt`, without reading or materializing source files, use the explicit
index-only command:

```text
adt flow index tr DEVK900001,DEVK900002
```

`checkout` remains strict: if any versioned component has no exact source
boundary, it fails without changing the workspace. `checkout --partial` is a
separate explicit opt-in that materializes only exact objects. `index` never
materializes source; it retains the complete transport inventory and records
every unresolved component as an `omitted` descriptor for a later retry.

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

// Use the format plugin already registered by @abapify/adt-plugin-abapgit
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
indexed files before mutation, and rolls back a failed multi-file apply.
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
