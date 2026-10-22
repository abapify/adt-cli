# aff-schema-conformance

## ADDED Requirements

### Requirement: Official AFF schemas are vendored and pinned

The plugin SHALL ship the official `file-formats/{type}/{type}-v{n}.json`
schemas and `examples/` fixtures vendored at a recorded upstream SHA, with
a repeatable sync script. No schema lookup SHALL require network access at
build or test time.

#### Scenario: Schema re-sync is reproducible

- **GIVEN** a new upstream commit of SAP/abap-file-formats
- **WHEN** the sync script runs with the new SHA
- **THEN** vendored schemas and examples update deterministically and the
  recorded pin reflects the new SHA

#### Scenario: Upstream format change is isolated

- **WHEN** an upstream schema introduces an incompatible change under a new
  `formatVersion`
- **THEN** the existing pinned `v{n}` models and emitters remain
  unmodified, and the new version is added as a separate generated model

### Requirement: Emitted AFF JSON validates against the official schema

For every type emitting AFF JSON, a test SHALL validate output against the
vendored official schema for the emitted `formatVersion`.

#### Scenario: Golden fixture round-trip

- **GIVEN** a vendored upstream example for object type `T`
- **WHEN** the example is deserialized and re-serialized
- **THEN** the emitted `.json` validates against `T`'s vendored schema
- **THEN** the serialization preserves all schema-required fields

#### Scenario: Schema violation fails loudly

- **WHEN** a `toAffJson` mapper emits a document violating the schema
- **THEN** the type's conformance test fails with the ajv error details,
  not a silent drop

### Requirement: Coverage is measurable

A coverage target SHALL produce a machine-readable matrix over the
official catalog (`type × [handler, aff-json, legacy-xml, fixtures,
schema-validated]`).

#### Scenario: Coverage regression is caught

- **WHEN** a covered type loses its schema-validation test or handler
  registration
- **THEN** `aff-coverage` fails and reports the regressed rows
