# Design — AFF Full Coverage

## Package placement

AFF lives in **`packages/adt-plugin-gcts`** — the existing gCTS/AFF format
plugin, peer of `adt-plugin-abapgit`. gCTS and AFF share the same on-disk
layout (JSON metadata, `(ns)` folder convention); abapGit's legacy XML is
a different format and stays in its own plugin. Cross-plugin sharing goes
through `@abapify/adt-plugin` contracts + `@abapify/adk` data, never
through handler reuse across the format boundary.

## Current state (measured, not estimated)

| Metric                                    | Value |
| ----------------------------------------- | ----- |
| Official AFF object types (pin `5ed949a`) | 91    |
| Registered in `adt-plugin-gcts`           | 91    |
| …dedicated handlers                       | 15    |
| …`wave2-generic.ts` minimal stubs         | 76    |
| abapGit emitting AFF JSON today           | ~13   |
| abapGit legacy-XML only                   | ~48   |

AFF-JSON-capable today: `bdef`, `desd`, `srvd`, and the
`createCdsAffSourceHandler` family (`ddls`, `dcls`, `ddlx`, `dteb`,
`dtix`, `dtdc`, `dsfd`, `drty`, `dtsc`, `dras`).

Format plumbing already exists end-to-end:
`FormatSerializeOptions.format: 'aff' | 'legacy'`
(`packages/adt-plugin/src/lib/format/format-plugin.ts`) and
`serializeDualFormat`/`serializeAffSource`/`affFromAffJson`/
`affGetSource`/`affSetSources` in
`packages/adt-plugin-abapgit/src/lib/handlers/source-resolver.ts`.

## Key architectural decisions

### 1. AFF JSON schema is the contract — not XSD

The XSD-first rule governs the **legacy `asx` XML** path only. For the AFF
path the official `{type}-v{n}.json` JSON Schema _is_ the formal contract —
stronger than XSD for this format because it is generated upstream from
the same `zif_aff_*` interfaces SAP serializes against. Per-type AFF work
therefore does **not** require the XSD/codegen pipeline; it requires:

1. a typed model generated from the JSON Schema,
2. a `toAffJson` mapper (ADK object data → AFF JSON),
3. companion-file wiring per the spec file-name grammar,
4. an ajv schema-validation + golden-fixture test.

### 2. Submodule is the vendor — never fetch at runtime

`git_modules/abap-file-formats` is already a git submodule pinned at
`5ed949a` — schemas (`{type}-v{n}.json`) and `examples/` come straight
from it; the pin lives in `.gitmodules`. Re-sync = `git submodule update
--remote git_modules/abap-file-formats` + a commit. AFF schemas are
marked unstable upstream ("might still change incompatibly") — the
submodule pin + `formatVersion` consts isolate us.

### 3. Typed models via codegen, not hand-written types

`packages/adt-plugin-gcts/scripts/generate-aff-schemas.ts` already exists
(`json-schema-to-typescript`, reading `git_modules` schemas) — wire its
`codegen` target output into `src/schemas/generated/{type}.ts` exporting
`Aff{Type}V{n}` plus an ajv validator per version. Generated files are
build artifacts — never hand-edit.

### 4. `toAffJson` derivation from `toAbapGit`

SAP's ID-transformation convention maps the same underlying DDIC
structure to both envelopes: AFF `camelCase` property ↔ XML `UPPERCASE`
element (e.g. `header.originalLanguage` ↔ `HEADER/ORIGINALLANGUAGE`). For
the ~48 legacy-only types, the existing `toAbapGit` mapping is the primary
derivation source; the schema tells us exactly which fields to keep, drop
(AFF removes system/redundant fields), and rename. This is **mechanical
but verified per type** — schema validation plus upstream example
fixtures are the oracle.

### 5. Stubs become conformant handlers — no new registrations

All 91 types are already registered; the work is **enriching the 76
wave2 stubs** into schema-conformant emitters: generated model →
full `toMetadata`/`fromMetadata` (gcts `createHandler` contract) →
companion sources. A stub graduates to a dedicated `objects/{type}.ts`
file per family; `wave2-generic` keeps the still-minimal remainder.

## Per-type effort model

Every type follows the same checklist (automatable for ~80% of types):

1. `aff-sync` vendor schema + examples (automatic).
2. `aff-codegen` emit typed model + validator (automatic).
3. `toAffJson`/`fromAffJson` mapper — from `toAbapGit` where present,
   else from schema `header`+body shape (semi-automatic, human-reviewed).
4. Companion files: derive file shape from the type's `examples/` dir —
   plain metadata, source-bearing (`.abap`/`.acds`/`.csn`/…), or
   texts-bearing (`.properties`).
5. Golden test: vendored upstream example parses→emits→validates.
6. Register, index, coverage matrix row flips green.

## Wave plan

| Wave | Scope                                                                                                                                     | Size          |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| W0   | Machinery: wire `generate-aff-schemas` codegen, `affValidate` ajv harness over `git_modules` examples, `aff-coverage` nx target + matrix  | infra         |
| W1   | Enrich stubs — families: AIF ×7, eDoc ×4, FLP/IAM/auth ×5, Notes ×2                                                                       | 18            |
| W2   | Enrich stubs — metadata singletons: `advc aobj apic apob chke dcat dmon dobj ilmb intm rvbc saia sco2 sprv srvc svim sxtg` + `cfdf` (v2)  | 18            |
| W3   | Enrich stubs — source-bearing/special: `ddla` (`.acds`), `csnm` (`.csn`), `evto`, `ints`, `iwng`, `docu` (root-level schema file, no dir) | 6             |
| W4   | abapGit AFF-JSON parity for its ~48 legacy-only types (in `adt-plugin-abapgit`, via `toAffJson` derived from `toAbapGit`)                 | ~48           |
| W5   | Conformance hardening: LIMU naming, `.properties` texts, namespace brackets, multi-`formatVersion`, deserialize parity, docs + CI gate    | cross-cutting |

_76 stubs split 18+18+5(+1 docu edge) in W1–W3, the rest graduate during
W4/W5 — per-type file shapes are derived from each type's `examples/`
dir during its wave, not pre-guessed here._

## Spec details the conformance layer must implement

From `docs/specification.md`:

- File name grammar:
  `<object_name>.<object_type>.[<sub_object_name>.<sub_object_type>.][<content_type>.][<language>.]<file_extension>`
- Namespace `(nmspc)` bracket conversion in file names.
- Mandatory metadata file `<name>.<type>.json` per object.
- `.properties` files carry per-language texts; language tag is BCP47.
- Formatting: UTF-8, no BOM, `\n` EOL, empty line at EOF, 2-space JSON
  indentation (`.editorconfig`-equivalent rules, emit-side enforced).

## Risks

- **Upstream instability** — AFF explicitly disclaims stability;
  `formatVersion` const in each schema + vendored snapshots + per-type
  version pin absorb this. A v2 bump becomes a schema re-sync + added
  variant, never a silent break.
- **JSON↔XML name drift** — the camelCase/UPPERCASE correspondence is a
  convention, not a guarantee (AFF drops redundant/system fields, renames
  some). Mitigated by schema-as-oracle: anything emitted is validated
  against the official schema, so drift surfaces as a test failure, not
  wrong output.
- **`docu` edge** — its schema lives as a root-level
  `file-formats/docu-v1.json` with no type dir; handle as a special case.
- **ADT reachability** — many of the 41 (IWNG, EDOC, SIA5…) have no ADT
  endpoint; they are serialize-only targets (import/fixture-driven),
  consistent with the plugin's separation of serialization from fetching.
- **Fixture quality** — upstream examples are minimal; augment with
  abapGit test repos / live exports where a type's semantics need more
  than the header-level example to pin down.
