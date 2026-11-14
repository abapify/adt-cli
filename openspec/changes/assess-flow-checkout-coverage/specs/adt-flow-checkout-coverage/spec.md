# adt-flow checkout coverage assessment

## ADDED Requirements

### Requirement: Validated coverage assessment binds report, descriptors and file evidence

The SDK SHALL provide `assessFlowCheckoutCoverage(input)` that binds a
`FlowCheckoutReport`-shaped payload, object descriptor payloads and
caller-supplied file evidence into a versioned, deterministic assessment
without filesystem, Git or SAP access.

#### Scenario: Complete coverage with verified evidence

- **WHEN** the report is valid, every resolved inventory entry maps to a
  descriptor identity, and every descriptor owned file has caller evidence
  whose hash matches the descriptor
- **THEN** the assessment has status `complete`, reports the report's scope
  and mode, and lists the verified acquired files

#### Scenario: Typed omissions keep the assessment partial

- **WHEN** the report carries skipped, derived or absent object entries, or
  inventory entries cannot be mapped to a descriptor identity
- **THEN** the assessment has status `partial` and a sorted, typed omission
  list that uses the coverage diagnostics `COVERAGE_ABSENT_OBJECT`,
  `COVERAGE_OWNERSHIP_UNMAPPED` and `COVERAGE_FILE_DIVERGED`, while report
  omissions keep their original acquisition diagnostics and derived
  components keep `SOURCE_COMPONENT_SCOPE_DERIVED`

#### Scenario: Missing or unsupported report is unknown

- **WHEN** the report payload is absent, not an object, or uses an
  unsupported schema or coverage version
- **THEN** the assessment has status `unknown` with reason
  `missing-report` or `unsupported-report`, and the caller cannot derive
  `complete` from it

#### Scenario: Source loss after acquisition is a divergence omission

- **WHEN** a descriptor owned file has verified absence (`null` evidence) or
  a hash that does not match the descriptor
- **THEN** the assessment classifies the file as deleted or diverged with a
  typed omission and the status is `partial`

#### Scenario: Owned paths keep their validation boundaries

- **WHEN** a descriptor has duplicate owned paths or an owned path outside
  `src/`
- **THEN** the assessment throws the established typed errors
  (`path_collision`, `path_invalid`) instead of returning an assessment

### Requirement: Assessment is deterministic and provider-agnostic

The assessment SHALL sort all emitted lists deterministically and SHALL NOT
contain provider, company, system, registry or private transport knowledge in
code, types or fixtures.

#### Scenario: Repeated assessment is byte-identical

- **WHEN** the same inputs are assessed twice
- **THEN** both assessments are deeply equal

### Requirement: Existing report and CLI contracts stay intact

The assessment SHALL NOT change the checkout report builders, the CLI flow
command, report storage layout or MCP tool contracts.

#### Scenario: Report builders unchanged

- **WHEN** the existing report builder tests run
- **THEN** they pass without modification
