# Proven CTS deletion reconciliation

## Purpose

Reconcile explicit transport deletion operations with owned serialized source independently of unrelated source acquisition omissions, without embedding provider or CI policy in the SDK.

## ADDED Requirements

### Requirement: Deletion evidence is explicit and scope-bound

The SDK SHALL validate latest-task inventory or a released, same-system transport-of-copies snapshot with one exact typed origin and equal non-control inventory. It SHALL NOT infer deletion from metadata 404, missing historical source, descriptions or timestamps.

#### Scenario: Partial source coverage with a proven deletion

- **GIVEN** direct inventory has a program D entry and an unrelated unsupported object
- **WHEN** the caller reconciles that inventory
- **THEN** the owned program files are removed and unrelated files remain unchanged

#### Scenario: Snapshot binding is invalid

- **GIVEN** a snapshot has a different inventory, origin, system or release/type boundary
- **WHEN** the caller supplies it as deletion evidence
- **THEN** validation fails before any source or descriptor changes

### Requirement: File deletion preserves ownership boundaries

The SDK SHALL use selected format ownership and indexed file hashes. It SHALL preserve modified or unproven files and report unapplied operations. A component deletion SHALL NOT delete its containing object. Path and symlink violations SHALL fail before writes.

#### Scenario: Whole object has companion files

- **GIVEN** a proven whole-class D operation and owned main, metadata and companion files
- **WHEN** reconciliation runs
- **THEN** all owned class files disappear and unrelated objects remain unchanged

#### Scenario: Package contains unrelated source

- **GIVEN** an indexed package metadata file and unrelated class files below its directory
- **WHEN** package deletion is reconciled
- **THEN** only the owned package metadata is removed

#### Scenario: Namespace and generic object type

- **GIVEN** the selected format resolves a namespaced object or a supported dictionary type
- **WHEN** a matching D operation is reconciled
- **THEN** its exact serialized files are removed without a consumer suffix table

### Requirement: Results and persistent ownership agree

The SDK SHALL return versioned per-operation applied, absent or unapplied evidence. Removed paths SHALL be absent and whole-object descriptors SHALL become tombstones transactionally. Dry run SHALL change neither source nor descriptors. Repetition SHALL be safe.

#### Scenario: Repeated reconciliation

- **GIVEN** an operation already removed an owned program
- **WHEN** the same proof is applied again
- **THEN** the report says already absent and does not invent another file removal

#### Scenario: Dry run

- **WHEN** the caller requests a dry run
- **THEN** planned paths are reported with no claimed removed paths and no filesystem writes
