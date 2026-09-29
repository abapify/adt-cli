## ADDED Requirements

### Requirement: Code review checks remain bounded analysis

The server SHALL classify `atc_run` and `run_unit_tests`, including coverage,
as `safe_execute` operations. An authenticated credential containing only
`server` and `read` authority SHALL NOT see or dispatch them; SAP analysis
execution requires an explicit execution grant.

> Note: this change originally reclassified these checks as `read`. During
> PR #173 review the exposure of SAP analysis execution to ordinary read
> credentials was flagged as a security finding and deliberately reverted —
> the `safe_execute` classification is the intended end state.

#### Scenario: Delegated read assistant lists tools

- **GIVEN** a delegated assistant has only `read` authority for one
  Destination
- **WHEN** it lists tools or directly calls `atc_run` / `run_unit_tests`
- **THEN** the checks are absent from the catalogue and dispatch is denied
  before a Destination lease or SAP operation

#### Scenario: Read authority remains non-mutating and non-executing

- **WHEN** the same assistant lists or calls a mutation or an analysis
  execution
- **THEN** the operation is absent or denied before SAP state is created

### Requirement: Stricter scoped ATC remains supported

The server SHALL accept an exact object-bound `safe_execute` credential for
`atc_run` or `run_unit_tests` when a workflow chooses that narrower
execution policy.

#### Scenario: Workflow supplies an exact ATC grant

- **WHEN** a valid scoped `safe_execute` credential names `atc_run` and exact
  object keys
- **THEN** catalogue and dispatch enforce the existing scoped policy
