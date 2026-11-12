## ADDED Requirements

### Requirement: Generic request/task normalization preserves CTS facts

The package SHALL expose a pure normalization over the existing transport
metadata projection. Normalization SHALL NOT invent metadata, discard
unsupported entries, or drop provenance.

#### Scenario: Task-less request stays a request

- **WHEN** a released request has no child tasks
- **THEN** normalization reports one request unit and no invented tasks

#### Scenario: Missing metadata stays missing

- **WHEN** the projection has no owner, description or timestamp for a unit
- **THEN** the normalized unit does not invent those fields

#### Scenario: Unsupported entries are retained

- **WHEN** the raw CTS inventory contains entries the projection does not map
- **THEN** normalization reports them as unsupported omissions with provenance
- **AND** the omission count is never zeroed

#### Scenario: Task parent identity is preserved

- **WHEN** a task unit is normalized
- **THEN** its parent identity and its own number survive unchanged

### Requirement: Ordered multi-root scope planning is deterministic

The package SHALL expose a pure scope planner over requested transports and
their normalized units.

#### Scenario: Duplicate requested identities deduplicate with provenance

- **WHEN** the same transport appears twice in the request list
- **THEN** the plan contains it once with both request origins recorded

#### Scenario: Task under a requested parent is not a second root

- **WHEN** a requested transport is a task whose parent request is also requested
- **THEN** the plan expands the parent once and records the task under it

#### Scenario: Mixed systems stay per-system

- **WHEN** requested transports resolve to different systems
- **THEN** the plan groups them per system without merging across systems

#### Scenario: Order is independent of input case and duplicates

- **WHEN** equivalent request lists differ only in case or duplicate entries
- **THEN** plans serialize identically and inputs are unchanged

#### Scenario: Empty request list yields an empty plan

- **WHEN** no transports are requested
- **THEN** the plan is empty and no root is invented

### Requirement: CTS inventory deduplicates to repository owners

The package SHALL expose a pure inventory deduplication that folds component
leaves into their repository owner without discarding provenance.

#### Scenario: Padded spellings merge without losing provenance

- **WHEN** the inventory contains entries for one object whose names differ
  only by padding or letter case
- **THEN** they form one owner group preserving every original entry

#### Scenario: Component leaves fold into the referenced owner

- **WHEN** a LIMU component entry references an owner via its WB type
- **THEN** it is grouped under that owner instead of standing alone
- **AND** namespaced names stay distinct from unprefixed names

#### Scenario: Ownerless leaves are retained

- **WHEN** an entry references no known owner
- **THEN** it forms its own group and is never discarded
