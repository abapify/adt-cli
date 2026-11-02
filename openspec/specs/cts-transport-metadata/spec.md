# cts-transport-metadata Specification

## Purpose

Typed CTS transport metadata for automation — request/task hierarchy, status, owner, and timestamps via `adt cts tr metadata --json` and the `cts_transport_metadata` MCP tool.

## Requirements

### Requirement: Typed transport metadata is available to automation

The system SHALL expose a read-only typed projection of a CTS request or task
that includes each returned unit's number, status, type, parent, owner,
description, and SAP last-change timestamp when SAP provides it.

#### Scenario: Request metadata includes child tasks

- **WHEN** a caller requests metadata for a CTS request that contains tasks
- **THEN** the result identifies the requested request and includes its request
  unit and child task units

### Requirement: CLI JSON stdout is machine-readable

On success, the `adt cts tr metadata <transport> --json` command SHALL write
exactly one JSON document to stdout and SHALL write diagnostics only to
stderr. On failure, the command writes diagnostics to stderr, exits non-zero,
and stdout is left empty.

#### Scenario: Successful JSON invocation

- **WHEN** the command successfully reads a transport with `--json`
- **THEN** stdout can be parsed directly as the typed metadata result

### Requirement: MCP and CLI share metadata semantics

The system SHALL expose an MCP `cts_transport_metadata` tool that uses the
same metadata service as the CLI command.

#### Scenario: Equivalent read through MCP

- **WHEN** CLI and MCP query the same transport
- **THEN** they return equivalent requested transport and CTS unit metadata

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
