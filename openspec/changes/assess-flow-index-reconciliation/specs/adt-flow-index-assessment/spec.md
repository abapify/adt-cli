## ADDED Requirements

### Requirement: Descriptor reconciliation assessment never grants mutation

The package SHALL assess validated descriptor ownership against caller-supplied
file hashes without Git, source reads, writes, or invented historical hashes.

#### Scenario: Accepted source changes explain a stale descriptor

- **GIVEN** every recorded owned file matches the supplied previous tree
- **WHEN** current evidence shows changed or explicitly absent owned files
- **THEN** assessment identifies the changed paths as stale

#### Scenario: Existing corruption is not forgiven

- **WHEN** any previous owned file hash differs from its recorded descriptor
- **THEN** assessment rejects reconciliation of a stale descriptor

#### Scenario: Missing evidence is not a deletion

- **WHEN** an owned path has no entry in current evidence
- **THEN** assessment rejects the unknown state rather than treating it as absent
