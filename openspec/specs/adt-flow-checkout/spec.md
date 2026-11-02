# adt-flow-checkout Specification

## Purpose

Materialize selected immutable transport sources while preserving repository
ownership and source components outside the transport scope.

## Requirements

### Requirement: Selected class updates preserve unselected baseline components

Flow checkout SHALL retain existing class source components that the transport
manifest did not select or delete. This applies to recognized legacy abapGit
files without descriptors and to indexed class files. The preserved bytes and
ownership hashes SHALL remain available for a later component checkout.
Previously indexed selections SHALL retain their original version references;
legacy preserved files SHALL NOT receive invented SAP versions.

#### Scenario: Main-only repair in an existing class

- **GIVEN** an existing class has main, local definitions, local implementations,
  macros and test classes, with or without object descriptors
- **WHEN** a transport selects only the class main source
- **THEN** the new main source is materialized and all unselected class source
  files remain byte-identical
- **THEN** unrelated objects remain unchanged and no mutable include is fetched

#### Scenario: Package relocation keeps the class together

- **WHEN** the selected class is materialized in a different package directory
- **THEN** preserved companions move with the class and retain their bytes

#### Scenario: Explicit deletion remains effective

- **WHEN** an exact manifest explicitly deletes a selected class component
- **THEN** that component is removed while the unselected components remain
- **WHEN** an exact whole-class deletion is selected
- **THEN** the complete owned class is removed

#### Scenario: Duplicate legacy components are ambiguous

- **GIVEN** two legacy paths map to the same preserved class component destination
- **WHEN** checkout plans the class update
- **THEN** checkout fails before source or descriptors change

#### Scenario: Later checkout selects a preserved companion

- **GIVEN** a main-only checkout preserved an unselected companion and its hash
- **WHEN** a later transport selects that companion
- **THEN** its selected source replaces the preserved bytes without an ownership collision
- **THEN** the remaining unselected class components remain unchanged

#### Scenario: Preserved version references depend on prior indexing

- **GIVEN** a checkout changes main from version 00002 to 00003
- **WHEN** an indexed class companion is preserved
- **THEN** the descriptor keeps its original version 00002 and source URI
- **WHEN** a legacy companion without a prior descriptor is preserved
- **THEN** no SAP version or source URI is invented for it

#### Scenario: A deletion-only companion transport keeps the class

- **GIVEN** an existing class with main and local source components
- **WHEN** a transport selects only the deletion of a local implementation
- **THEN** that implementation is removed and the other source components remain
- **THEN** the class descriptor remains present rather than becoming a whole-class tombstone

#### Scenario: Symlinked preserved source is rejected

- **GIVEN** indexed ownership names a companion symlink, including a target inside the repository
- **WHEN** checkout attempts to preserve or relocate that companion
- **THEN** it fails before source or descriptors change and does not copy the target bytes
