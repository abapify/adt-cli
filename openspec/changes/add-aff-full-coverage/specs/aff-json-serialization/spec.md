# aff-json-serialization

## ADDED Requirements

### Requirement: Every covered type can emit AFF JSON

Every registered gCTS object type SHALL support `format: 'aff'`, emitting the
spec file set: `<name>.<type>.json` metadata plus the companion files the
type's format defines (`.abap`/`.abdl`/`.acds`/`.csn`/`.ddic`/`.xdp`
sources, `.properties` texts).

#### Scenario: Legacy format remains selectable

- **GIVEN** a type that also has a legacy abapGit XML handler
- **WHEN** serialization runs with `format: 'legacy'`
- **THEN** the `.xml` metadata + source layout is emitted, unchanged

#### Scenario: AFF metadata file is always emitted

- **WHEN** any object serializes with `format: 'aff'`
- **THEN** output contains `<name>.<type>.json` with `formatVersion` and
  `header` populated, even when no source files exist

### Requirement: File names follow the AFF grammar

Emitted paths SHALL conform to
`<object_name>.<object_type>.[<sub_object_name>.<sub_object_type>.][<content_type>.][<language>.]<file_extension>`,
with `/NMSPC/` namespaces encoded as `(nmspc)` and language infixes in
BCP47.

#### Scenario: Sub-object file naming

- **GIVEN** a function module inside a function group
- **WHEN** it serializes with `format: 'aff'`
- **THEN** the file is named
  `{group}.fugr.{module}.func.abap`

#### Scenario: Text elements carry language

- **WHEN** a text-bearing type serializes translated texts
- **THEN** each text file is named
  `{name}.{type}.texts.{bcp47-lang}.properties`

### Requirement: Emitted files follow formatting conventions

AFF files SHALL be UTF-8 without BOM, `\n` line endings, a single trailing
newline at EOF, and 2-space JSON indentation.

#### Scenario: JSON formatting is stable

- **WHEN** any `.json` metadata file is emitted
- **THEN** it is indented with 2 spaces and ends with a newline

### Requirement: AFF JSON is deserializable

For every registered gCTS type, its `fromMetadata` hook SHALL reconstruct
the metadata fields (at minimum the `header` fields) needed for the
import path; the object name MAY come from `fromMetadata` or fall back to
the filename-derived name at deserialization. Source and companion files
are restored separately by the importer via `setSources` or
`_pendingSource`/`_pendingSources` staging — `fromMetadata` receives only
the parsed metadata JSON.

#### Scenario: Import of an AFF-serialized object

- **GIVEN** a spec-conformant `<name>.<type>.json` plus companions
- **WHEN** the plugin deserializes it
- **THEN** object name, description, original language, and pending
  sources are restored for the import path
