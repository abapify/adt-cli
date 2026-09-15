## ADDED Requirements

### Requirement: Transport checkout materializes a source boundary

`adt-flow` SHALL materialize versioned source components for an explicit
transport scope and SHALL use SAP source-version provenance rather than mutable
current source.

#### Scenario: Checkout the transport head

- **GIVEN** a released transport modified an existing source component
- **WHEN** `adt flow checkout tr <TR>` is executed
- **THEN** the newest version attributed to the transport scope is materialized
- **THEN** the mutable current-source endpoint is not substituted for that version

#### Scenario: Checkout the transport base

- **GIVEN** one or more released transports form the requested scope
- **WHEN** `adt flow checkout tr <TR[,TR...]> --base` is executed
- **THEN** each component materializes the version immediately older than its earliest in-scope version
- **THEN** input array order is not used as source chronology

#### Scenario: Source boundary is ambiguous or failed

- **GIVEN** a relevant component has ambiguous or failed source history
- **WHEN** checkout is requested
- **THEN** checkout fails with a typed bounded diagnostic
- **THEN** no repository path is changed

#### Scenario: Object has no materializable source history

- **GIVEN** a transport contains an otherwise relevant object whose manifest entry is `unsupported` or carries the `OBJECT_TYPE_UNSUPPORTED` diagnostic, including one whose ADT metadata cannot be loaded
- **WHEN** checkout is requested
- **THEN** checkout excludes that object without reading source or changing its repository paths
- **THEN** checkout continues with the remaining exact source components
- **THEN** the structured result and CLI diagnostics identify the skipped object and its diagnostic code

### Requirement: Creation and deletion produce reviewable trees

`adt-flow` SHALL represent source creation and deletion as absence on the
appropriate side of the transport boundary.

#### Scenario: Transport creates an object

- **GIVEN** an in-scope source component has no predecessor
- **WHEN** base is checked out
- **THEN** files owned by that component are absent
- **WHEN** head is checked out
- **THEN** the selected source files are present

#### Scenario: A later task changes an object first created in the same parent request

- **GIVEN** SAP attributes source versions from multiple child tasks to their common parent request
- **GIVEN** an earlier released task left a verified present object descriptor and owned files
- **WHEN** the later task base is checked out and its exact manifest is `added` at the parent boundary
- **THEN** the indexed object state is preserved as the incremental base
- **THEN** no mutable SAP source or selected source body is read for that base
- **WHEN** the later task head is checked out
- **THEN** the exact selected head replaces the indexed source as a modification

#### Scenario: Existing recognizable files have no descriptor

- **GIVEN** an exact `added` manifest and format-recognizable files for the same object identity
- **GIVEN** no object descriptor exists
- **WHEN** base is checked out
- **THEN** the recognizable files remain unchanged as the caller-provided base
- **THEN** no object descriptor is created for the base
- **WHEN** head is checked out
- **THEN** the exact selected head is materialized and the files are adopted into the index

#### Scenario: Transport deletes an object

- **GIVEN** CTS marks an object deleted and a recoverable predecessor exists
- **WHEN** base is checked out
- **THEN** the predecessor source files are present
- **WHEN** head is checked out
- **THEN** all descriptor-owned object files are absent
- **THEN** the object descriptor retains a deletion tombstone

### Requirement: Checkout reconciles the repository tree safely

Checkout SHALL reconcile additions, content updates, path moves, and removals
without invoking Git and SHALL validate the complete change set before mutation.

#### Scenario: Indexed object changes package

- **GIVEN** an object descriptor owns files at the previously observed path
- **GIVEN** current format materialization places the object at a new package path
- **WHEN** checkout is applied
- **THEN** old owned paths are removed and desired new paths are written
- **THEN** no Git command is invoked

#### Scenario: Indexed file was edited locally

- **GIVEN** an indexed owned file does not match its recorded SHA-256 hash
- **WHEN** checkout would update or remove that file
- **THEN** checkout fails with `working_tree_diverged`
- **THEN** the local file is not overwritten

#### Scenario: Desired path collides

- **GIVEN** a desired path is outside the repository, duplicates another owner, collides by portable case folding, or is occupied by an unrelated file
- **WHEN** checkout is planned
- **THEN** checkout fails before any file or descriptor is changed

#### Scenario: Apply fails after planning

- **GIVEN** the desired change set passed validation
- **WHEN** a filesystem operation fails during apply
- **THEN** flow restores the pre-checkout tree or reports an explicit unrecovered rollback failure
- **THEN** it never reports checkout success for a partial tree

### Requirement: Committed descriptors provide optional incremental state

Checkout SHALL maintain deterministic transport and object descriptors under
`.adt`, while SAP provenance remains authoritative for uncached selection.

#### Scenario: Successful head checkout

- **WHEN** a relevant transport head is checked out successfully
- **THEN** `.adt/tr/<TR>.json` records the normalized boundary selection without source bodies
- **THEN** every request/task discovered in the scope has its own descriptor
- **THEN** each descriptor retains its complete CTS object inventory, including unsupported and currently filtered types
- **THEN** each relevant object has a uniquely named descriptor under `.adt/objects/<TYPE>/`
- **THEN** descriptors contain no credentials, absolute paths, or wall-clock-only values

#### Scenario: Base is prepared before review

- **WHEN** a transport base is checked out successfully
- **THEN** predecessor object descriptors are updated only for objects present in that base
- **THEN** `.adt/tr/<TR>.json` is not created for the reviewed transport
- **THEN** a newly created object's absent base does not pre-create its object descriptor
- **THEN** a verified present descriptor from an earlier incremental task is preserved when SAP exposes only parent-request provenance

#### Scenario: Exact released head checkout is repeated

- **GIVEN** transport, config, format, selected versions, and owned file hashes match committed descriptors
- **WHEN** the same head checkout is repeated
- **THEN** checkout is a no-op
- **THEN** no SAP request or filesystem write is performed

#### Scenario: Selected component is already indexed

- **GIVEN** manifest selection matches the indexed component version and owned hashes
- **WHEN** checkout is executed after cache revalidation
- **THEN** the component source body is not downloaded
- **THEN** no corresponding file is rewritten

#### Scenario: Descriptors are removed

- **GIVEN** `.adt` descriptors are absent
- **WHEN** checkout is executed
- **THEN** source selection is reconstructed from SAP provenance and the repository tree
- **THEN** correctness is unchanged while additional SAP calls are permitted

### Requirement: Configuration limits relevant material

`adt-flow` SHALL load deterministic selection and performance configuration
from the root `adt.config.ts` and SHALL persist only relevant identities.

#### Scenario: Multiple selector dimensions are configured

- **GIVEN** object type, package, and application-component selectors are configured
- **WHEN** transport objects are evaluated
- **THEN** an object is relevant only when it satisfies every configured dimension
- **THEN** type filtering occurs before source-history retrieval

#### Scenario: A CTS configuration entry has no source representation

- **GIVEN** a transport contains an `R3TR SUSK` authorization-maintenance assignment
- **WHEN** checkout evaluates the transport
- **THEN** that non-source entry is excluded before source-history retrieval
- **THEN** all remaining relevant repository source components retain exact-boundary validation

#### Scenario: Configuration expands scope

- **GIVEN** a previously excluded object type or package becomes enabled
- **WHEN** checkout is executed again
- **THEN** the changed config digest invalidates the affected fast path
- **THEN** newly relevant objects are discovered without requiring a complete system clone

#### Scenario: A previously unsupported type becomes materializable

- **GIVEN** a committed transport descriptor inventories an unsupported CTS object
- **WHEN** the active flow implementation and configuration later support that repository type
- **THEN** the descriptor identifies the concrete request/task that must be retried
- **THEN** a successful head checkout replaces the pending inventory-only state with materialized object descriptors without losing the original CTS identity

### Requirement: MVP exactness is limited to source

`adt-flow` SHALL describe its selected source components as exact only when the
source-history manifest proves them exact, and SHALL NOT claim reconstruction
of historical object metadata.

#### Scenario: Historical source is serialized with current metadata

- **GIVEN** SAP provides an immutable historical source but no corresponding historical object metadata
- **WHEN** the format tree is materialized
- **THEN** the source file uses the selected immutable content
- **THEN** any metadata file is explicitly classified as checkout-time metadata rather than historical metadata

### Requirement: Flow does not own delivery workflow

`adt-flow` SHALL transform the selected repository tree and return a structured
result without managing external delivery state.

#### Scenario: Checkout completes

- **WHEN** checkout succeeds
- **THEN** the result reports changed, moved, removed, and unchanged paths plus descriptor updates
- **THEN** no branch, commit, push, rebase, merge request, route, database record, or business-task assignment is created
