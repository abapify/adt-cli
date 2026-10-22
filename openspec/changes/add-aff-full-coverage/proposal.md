# Add AFF Full Coverage

## Why

SAP's [ABAP File Formats](https://github.com/SAP/abap-file-formats)
catalog is the canonical file-level contract for ABAP repository objects —
the format ADT, gCTS, and (increasingly) abapGit interoperate through. It
defines **91 object types** (at pinned `5ed949a`), each shipping a published JSON Schema
(`file-formats/{type}/{type}-v{n}.json`) and golden example files.

AFF is **not** an abapGit format — it is SAP's canonical file-level
contract consumed by ADT export, gCTS, _and_ abapGit. The repo already
has the right boundary: `adt-plugin-gcts` is the AFF/gCTS format plugin,
peer of `adt-plugin-abapgit`, with `file-formats` vendored as the
`git_modules/abap-file-formats` submodule (pinned `5ed949a`).

Today `adt-plugin-gcts`:

- registers **all 91 official object types** — 15 dedicated handlers +
  `wave2-generic.ts` stubs for the remaining 76;
- but the stubs emit only a minimal `{ formatVersion, header }` envelope —
  **no type-specific body fields, no source companions**;
- cannot validate output — `scripts/generate-aff-schemas.ts` exists but
  produced validators are not wired into tests or the emit path.

Today `adt-plugin-abapgit`:

- covers **~61 of the 91** official AFF object types as **legacy abapGit
  XML** (a different on-disk format, kept as its own concern);
- emits **AFF JSON for only ~13** (the CDS/source-driven family via
  `createCdsAffSourceHandler` + `serializeDualFormat`).

Supporting the full AFF surface — every object type, every file extension
defined by the spec (`.json` metadata, `.abap`, `.abdl`, `.acds`, `.csn`,
`.ddic`, `.xdp` sources, `.properties` texts) — means finishing
`adt-plugin-gcts` into a complete spec-validated serializer, with AFF-JSON
parity inside abapGit as a follow-on, not a fork.

## What Changes

- **Consume** the already-vendored schemas and examples from the
  `git_modules/abap-file-formats` submodule (pinned `5ed949a`) — bumping
  the submodule is the sync mechanism, no copy script needed.
- **Wire** `scripts/generate-aff-schemas.ts` (already present, reading
  `file-formats/{type}/{type}-v{n}.json` via `json-schema-to-typescript`)
  into `nx codegen adt-plugin-gcts` so typed models exist for every type.
- **Validate** every emitted `.json` metadata file against the official
  schema (ajv) in golden tests driven by the submodule's `examples/` —
  zero network at test time.
- **Enrich the 76 wave2 stubs** to emit their full schema body
  (type-specific fields, source companions) per family — the type is the
  contract, a minimal envelope is not conformance.
- **Bring abapGit's ~48 legacy-XML-only types to AFF-JSON parity** via
  per-type `toAffJson` mappers derived from `toAbapGit` (SAP's
  ID-transformation maps the same DDIC structures — largely mechanical).
- **Spec conformance layer**: file-name grammar
  (`<name>.<type>.[<sub>.<subtype>.][<content>.][<lang>.]<ext>`), `(nmspc)`
  namespace bracket encoding, BCP47 language tags, formatting conventions
  (UTF-8, LF, mandatory trailing newline, 2-space JSON indent), and
  `fromAffJson` deserialize parity for the import direction.
- **Coverage gate**: `bunx nx run adt-plugin-gcts:aff-coverage`
  generates a per-type matrix (`type × [handler-kind, body-fields,
companions, fixtures, schema-validated]`) and fails CI below the
  target threshold.

### Non-goals (deferred)

- Typed ADK models / ADT CRUD for object types ADT does not expose —
  _serialization_ support is independent of _fetch_ support. The generic
  `AdkObject` + `unwrapData`/`dataSync` path is sufficient for
  serialization-from-data.
- Legacy-XML handlers for types abapGit never serialized (most of the 41
  missing — AFF JSON is their only canonical file format).

## Capabilities

### New Capabilities

- `aff-schema-conformance` — vendored official schemas, generated typed
  models, per-type schema-validation and golden-fixture tests.
- `aff-json-serialization` — spec-conformant `.json` metadata plus
  companion files for every covered type.

### Modified Capabilities

- `abapgit-object-serialization` — every existing handler gains an
  AFF-JSON path; the `format` option becomes meaningful for all types
  rather than the CDS family only.
