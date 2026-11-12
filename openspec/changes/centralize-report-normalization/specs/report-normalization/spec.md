## ADDED Requirements

### Requirement: Canonical ATC normalization preserves identity and location facts

The `adt-atc` package SHALL expose pure normalization over its finding/result
model that keeps check identity, repository paths, categories and locations
stable across output formats.

#### Scenario: Duplicate findings keep distinct identity

- **WHEN** a result contains two findings with identical check and object
  but different message ids or locations
- **THEN** normalization preserves both with stable per-finding fingerprints

#### Scenario: Category collisions resolve deterministically

- **WHEN** findings in one result carry conflicting result-level categories
- **THEN** normalization resolves the result category deterministically and
  keeps each finding's own category

#### Scenario: Composite objects keep both sides

- **WHEN** a finding references a composite object (e.g. a class and its
  component)
- **THEN** the normalized finding preserves the owner and the component
  location facts

#### Scenario: Namespace handling is stable

- **WHEN** findings reference namespaced objects
- **THEN** the normalized location and identity keep the namespace segment

### Requirement: Variant merging is deterministic with injected policy

The `adt-atc` package SHALL expose a pure variant-merge over normalized
results whose priority/severity policy is injected; core never reads
configured policy or publishes to providers.

#### Scenario: Merge order does not change the merged result

- **WHEN** the same variants are merged in different orders
- **THEN** the merged normalized result is identical

#### Scenario: Severity policy is injected

- **WHEN** variants are merged
- **THEN** severity aggregation uses the caller-provided policy only

### Requirement: AUnit normalization separates assertions from errors

The `adt-aunit` package SHALL expose pure normalization of JUnit/JaCoCo
reports that keeps integrity and source-path facts without confusing
assertion failures with technical errors.

#### Scenario: Assertion failures stay assertion failures

- **WHEN** a test failed with an assertion message
- **THEN** normalization classifies it as an assertion failure, not a
  technical error

#### Scenario: Malformed reports fail typed

- **WHEN** a report is malformed or incomplete
- **THEN** normalization raises a typed error instead of inventing counts

#### Scenario: Package-level coverage totals aggregate deterministically

- **WHEN** JaCoCo coverage is normalized
- **THEN** package-level totals are computed from class-level facts
  deterministically

#### Scenario: Zero-test runs are honest

- **WHEN** a suite contains zero tests
- **THEN** the normalized result reports zero tests and is not treated as
  an error

#### Scenario: Source paths are normalized without repair heuristics

- **WHEN** source paths appear in different formats
- **THEN** normalization preserves the recorded path facts; consumers own
  path repair
