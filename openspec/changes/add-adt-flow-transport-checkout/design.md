## Context

`@abapify/adk` already owns transport/object orchestration and can produce a
component-granular manifest of immutable base/head source references.
`@abapify/adt-plugin-abapgit` can serialize current ADK objects, but its legacy
import API writes directly to the filesystem and obtains source through mutable
object getters. That API cannot safely stage an exact historical source,
calculate a move, or validate a complete change set before mutation.

The target consumer starts from a caller-managed repository state, checks out
the base for a transport scope, commits it externally if needed, then checks
out released transports one at a time and commits each result externally.
`adt-flow` is responsible only for transforming the working tree.

## Goals / Non-Goals

**Goals:**

- Make modified source appear as a modification and deleted source appear as a
  deletion in the caller's eventual merge request.
- Materialize the exact source state immediately before or at a released
  transport boundary, independently per source component.
- Make repeated use incremental, deterministic, idempotent, and bounded.
- Reconcile adds, updates, moves, and removals without a Git dependency.
- Keep format logic extensible while shipping only abapGit in the MVP.
- Keep descriptors relevant, deterministic, portable, and safe to commit.

**Non-Goals:**

- Git commands, commit creation, branch management, rebasing, routing, merge
  requests, external work-item mapping, or workflow execution.
- A persisted plan abstraction or array of heterogeneous flow steps.
- Replication or rewriting of historical commits.
- Historical object metadata reconstruction. MVP exactness applies to source
  components; metadata emitted by the format adapter is the metadata available
  at checkout time.
- Database-backed indexing, background daemons, or a globally complete SAP
  object catalogue.
- Multiple simultaneously active repository formats.

## Decisions

### 1. One command, one entity kind, one snapshot flag

The MVP surface is:

```text
adt flow checkout tr <TR[,TR...]> [--base]
```

The entity token `tr` is explicit so future package or object checkout can be
added without changing transport syntax. With `--base`, each component selects
the version immediately older than its earliest change in the complete
transport scope. Without it, each component selects its newest in-scope
version. The input list defines scope, not chronology; SAP provenance and feed
order remain authoritative.

Alternatives rejected:

- `import`: understates move and delete reconciliation.
- `--snapshot previous|head`: creates an enum for a binary choice.
- `flow plan add/apply`: introduces persisted workflow machinery before a
  second operation exists.
- release-date sorting inside flow: callers apply release events one by one;
  ordering commits is outside tree materialization.

### 2. Compose exact-source-history; never reimplement it

`adt-flow` calls `buildTransportSourceManifest`. It rejects any relevant
`ambiguous` or `failed` entry before reading source bodies or changing files.
It records and excludes `unsupported` entries, so object types with no
source-history implementation and objects whose ADT metadata cannot be loaded
do not block exact components in the same transport. It lazily downloads only
selected base or head bodies.

For an added component, base means absence. For a deleted component, base
materializes the recoverable predecessor and head means absence. This produces
the expected creation/deletion delta when the caller commits both boundaries.

Historical object metadata is not versioned by this contract. The MVP therefore
describes itself as source-exact, not whole-object-history-exact.

### 3. `adt-flow` is a public service package with thin delivery adapters

The new package owns schemas, selection/materialization orchestration, index
storage, reconciliation, and a public service API. Its command exports a
`CliCommandPlugin` and depends only on `@abapify/adt-plugin` CLI types, not on
`@abapify/adt-cli`. The CLI loader supplies `cwd`, config, logger, and an
authenticated client through the established context. `adt-mcp` exposes the
matching `flow_checkout_tr` tool and delegates to the same service. The tool is
explicitly classified as a workspace-filesystem mutation and returns no source
bodies.

The service returns a structured result shared by CLI and MCP parity tests.
Console formatting, MCP envelopes, and process exit behavior remain in the
thin delivery adapters.

### 4. Formats return a desired tree and do not mutate the filesystem

Add an optional materialization capability to `FormatPlugin`. Its input
contains object identity/current metadata, the resolved package path, explicit
source-component contents, and format options. Its output is a deterministic
set of repository-relative files. It performs no filesystem or ADT calls.

The abapGit adapter implements this capability by reusing its handler registry,
folder logic, and schemas. Historical source is injected explicitly instead of
temporarily replacing ADK getters. The legacy filesystem-writing import API
remains compatible.

This boundary lets `adt-flow` validate every desired path, stage the complete
change set, and then reconcile it. A future native ADT or gCTS adapter can
implement the same contract without changing flow orchestration.

### 5. Descriptors are an optional committed cache, not source of truth

Transport descriptors live at `.adt/tr/<TR>.json`. Object descriptors live
at `.adt/objects/<TYPE>/<encoded-name>.<type>.adt.json`. Names and types are
normalized; names unsafe as path segments are reversibly encoded, while the
canonical `R3TR/<TYPE>/<NAME>` identity is also stored inside the file.

An object descriptor records only relevant data:

- schema and format versions;
- canonical identity and present/absent/deleted state;
- selected source-version identity per component;
- owned relative paths, semantic role, and SHA-256 content hash;
- current package/path information needed for later reconciliation;
- config digest that selected the object.

A transport descriptor is written only by successful head checkout, so
`.adt/tr/<TR>.json` first appears with the externally created transport commit,
not in a base commit. One descriptor is written for every request/task discovered
in the scope. It records normalized requested/scope transports, the complete CTS
object inventory with concrete task provenance, relevant materialized object
descriptors, and config/format digests. Unsupported and currently filtered object
identities remain in the inventory so a later format/configuration upgrade can
identify the exact transports that need another materialization attempt. Base
checkout updates only predecessor object descriptors
that actually exist; it does not pre-create the reviewed transport descriptor
or an absent descriptor for a newly created object. Descriptors exclude source bodies,
credentials, source bodies, absolute paths, and wall-clock
`fetchedAt` values.

Deleting `.adt` forces discovery and selected-source reads again but does not
change source selection. Descriptors are not a database and never override SAP
provenance.

### 6. Two incremental paths preserve correctness

For the exact same released head checkout, matching
transport/config/format descriptors plus matching owned-file hashes yield a
zero-SAP-call no-op. Base checkout still validates its selection manifest, but
can avoid all selected-source body reads when predecessor object descriptors
and hashes match.

Otherwise flow rebuilds the metadata-only source manifest. For each component:

- if the selected version and owned-file hashes match the object descriptor,
  no source body is fetched or written;
- if the selected version differs, only that selected immutable body is read;
- if an indexed owned path is missing or has a different hash, flow fails with
  `working_tree_diverged` rather than overwriting it;
- without an object descriptor, flow may adopt format-recognizable files for
  the same canonical identity, but any unrelated destination collision fails.

Some SAP releases attribute every immutable version created by child tasks to
their common parent request. A later task can therefore still be reported as
`added` at the parent provenance boundary even though an earlier released task
already materialized the object. In base mode, a verified present object
descriptor is the incremental predecessor and is reused without source reads.
Without a descriptor, format-recognizable files for the same identity remain
the caller-provided base and are adopted by the subsequent head checkout. Only
an object absent from both the index and the repository tree has an absent base.
The selected head still comes from exact SAP provenance; mutable SAP source is
never substituted.

The event source supplies released transports. Flow does not add a second
release-state check: exact selection remains authoritative, and the transport
descriptor makes the zero-call fast path explicit and deterministic.

### 7. Reconciliation is Git-independent and fail-before-write

Flow computes all desired files and compares them with descriptor-owned and
format-recognizable existing files. It validates path containment,
case-insensitive collisions, duplicate ownership, indexed hashes, and source
exactness before applying changes.

Application then writes changed files, removes obsolete owned files, updates
descriptors, and removes only empty directories created/owned below the format
root. A package reassignment is therefore an old-path removal plus a new-path
write. Git may recognize that as a rename, but flow neither invokes nor assumes
Git rename detection.

Staging/rollback mechanics MUST ensure a failed apply does not leave a partial
checkout. Literal filesystem atomicity across many paths is not assumed.

### 8. Configuration is deterministic and selection-oriented

`adt.config.ts` gains a typed `flow` section with:

- exactly one active `format` (`abapgit` in MVP);
- declarative inclusion by object type, package, and application component;
- bounded metadata/source concurrency;
- format-specific options already understood by the selected adapter.

Object type filtering happens before object metadata/history work. Package and
application-component filtering happens after the minimum metadata needed to
evaluate it. Empty dimensions impose no restriction; when multiple dimensions
are configured, an object must satisfy every configured dimension. The config
digest invalidates relevant cache entries, so enabling a new type or package
causes only newly relevant material to be discovered.

Arbitrary routing functions, credentials, branch names, and business-specific
identifiers are forbidden from the flow contract. Future deterministic mapping
functions require a separate design.

## Risks / Trade-offs

- **Historical metadata is unavailable** → State source-only exactness
  explicitly. Do not claim exact package/attribute history during cold
  reconstruction; indexed successive checkouts can still reconcile observed
  path changes.
- **Deleted object metadata may no longer load** → Reuse source-history typed
  diagnostics and fail closed unless the base is recoverable. Object types
  explicitly classified as unsupported are skipped with their diagnostic rather
  than being misrepresented as an exact boundary.
- **Large transports can overload SAP** → Filter types early, bound both
  metadata and source reads, deduplicate component URIs, and fetch bodies only
  after complete manifest validation.
- **Config changes expand scope** → Include config and format digests in
  descriptors; rerun discovery while retaining valid indexed objects.
- **Working tree contains unrelated edits** → Verify indexed hashes and reject
  unowned collisions before mutation.
- **Case-sensitive behavior differs by platform** → Normalize identities and
  detect collisions using a portable case-folded path key.
- **Current format plugin writes directly to disk** → Add the pure
  materialization contract additively and preserve legacy consumers.
- **Source-history behavior evolves independently** → Depend on its public
  contract and do not copy its selection logic into flow.

## Migration Plan

1. Add and test the pure format-materialization contract and abapGit adapter.
2. Add `adt-flow` service/index/reconciler with fixtures and filesystem tests.
3. Add the command plugin and typed config surface, then opt in through
   `adt.config.ts`.
4. Add the MCP twin and prove CLI/MCP service/result parity.
5. Run one bounded live released-transport smoke test after authentication
   and record only identities, counts, statuses, and hashes.

Rollback removes the command registration and package. Generated abapGit files
remain ordinary files, and `.adt` can be removed without migration.

## Open Questions

- Can application component be resolved with bounded package metadata calls on
  every supported release, or must that selector remain conditional initially?
- What maximum source-body size should flow accept per component before failing
  with a bounded diagnostic?
