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
