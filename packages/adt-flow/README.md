# @abapify/adt-flow

Incremental transport source-tree materialization for ADT. The service checks
out either the exact source boundary immediately before a transport scope or
the newest exact source in that scope.

Register the command and configure the active format in `adt.config.ts`:

```typescript
import { defineConfig } from '@abapify/adt-config';

export default defineConfig({
  commands: ['@abapify/adt-flow/commands/flow'],
  flow: {
    format: { id: 'abapgit', options: { folderLogic: 'prefix' } },
    include: { objectTypes: ['CLAS', 'INTF'] },
    concurrency: { metadata: 4, sources: 4 },
  },
});
```

Then reconcile the current directory to either side of the transport boundary:

```text
adt flow checkout tr DEVK900001 --base
adt flow checkout tr DEVK900001
adt flow checkout tr DEVK900001,DEVK900002 --base
```

Automation can request structured inventory/materialization evidence in either
mode:

```text
adt flow checkout tr DEVK900001 --report .adt/checkout-coverage.json
adt flow checkout tr DEVK900001 --base --report .adt/checkout-coverage.json
```

The report (`schemaVersion: 1`, `coverageVersion: 1`) records mode/scope, original
CTS inventory, and one resolution outcome for every inventory item. Resolutions
identify the repository object, including deduplicated leaves; non-source CTS
items such as `R3TR SUSK` carry `outcome: "non-source"` and do not claim a
repository owner. The report also records object descriptor paths, added
objects absent from the resulting base workspace, skips and index-only status.
Consumers can validate owned-file hashes and selected source components before
publishing a snapshot. Requesting a report recomputes the inventory instead of
using the exact-head transport-index shortcut. Existing partial reports keep
their original format. The default CLI skip policy is unchanged; consumers must
enforce their desired completeness policy.

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
