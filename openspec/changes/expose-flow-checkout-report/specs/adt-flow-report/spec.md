## ADDED Requirements

### Requirement: Public checkout report builders preserve the wire contract

The package SHALL expose pure typed builders for the version-one full checkout
report and partial omission report. The CLI SHALL serialize those same results.

#### Scenario: Unknown inventory remains unknown

- **WHEN** checkout has no inventory or resolution evidence
- **THEN** the builder does not invent either field or a completeness status

#### Scenario: Omission ordering is independent of input order

- **WHEN** equivalent checkout results contain differently ordered omissions
- **THEN** reports serialize identically and input arrays are unchanged

#### Scenario: Index-only checkout is reported honestly

- **WHEN** checkout records inventory without source materialization
- **THEN** the full report retains `indexedOnly: true` and the version-one scope
