# method-surgery Specification

## Purpose

Targeted method-body replacement in ABAP classes via `update_source action:"editMethod"` / `adt source write --method` without requiring the caller to supply the full class source.

## Requirements

### Requirement: Edit a single method without supplying the full class source

The system SHALL extend `update_source` with an `action: "editMethod"` variant and extend `adt source write` with `--method <methodName>` that replaces only the body of the named method in an existing ABAP class, so the caller supplies only the method body — not the full class source. The implementation fetches the current full source, splices the method, and writes the reconstructed full source back to SAP via the standard source/main PUT (a partial-payload write is tracked as follow-up work).

#### Scenario: Method body is replaced correctly

- **WHEN** the user provides `objectName: "ZCL_ORDER"`, `objectType: "CLAS"`, `action: "editMethod"`, `methodName: "PROCESS"`, and the new method body
- **THEN** the system fetches the full class source, splices in the new body between the existing `METHOD PROCESS.` and `ENDMETHOD.` lines, and writes the modified full source back to SAP

#### Scenario: Non-existent method returns an error

- **WHEN** the specified `methodName` does not exist in the class source
- **THEN** the tool returns `isError: true` with message "Method <name> not found in <class>"

#### Scenario: Method surgery reuses standard lock/PUT/unlock flow

- **WHEN** method surgery writes to SAP
- **THEN** it uses the existing `LockService.lock`, PUT `/source/main`, `LockService.unlock` sequence — no new lock protocol

#### Scenario: Edit method with transport request

- **WHEN** the user provides a `transport` parameter alongside `editMethod`
- **THEN** the transport number is passed through to the lock and PUT calls

### Requirement: Method boundary detection via line scan

The system SHALL locate the method boundary using a case-insensitive line scan for `METHOD <name>.` and `ENDMETHOD.` tokens, stripping inline ABAP comments before matching. The implementation MUST handle inline comments after the period on both `METHOD` and `ENDMETHOD` lines.

#### Scenario: Simple scan finds method boundaries

- **WHEN** the class source contains `METHOD process.` followed later by `ENDMETHOD.` (optionally indented)
- **THEN** the system correctly identifies the start and end lines for splicing

#### Scenario: Ambiguous scan returns null

- **WHEN** the simple line scan finds multiple potential `METHOD <name>` occurrences (e.g. local test classes)
- **THEN** the system returns `null` to avoid corrupting the wrong method body
