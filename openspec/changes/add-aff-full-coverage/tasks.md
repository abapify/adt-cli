# Tasks — AFF Full Coverage

## 0. Machinery (Wave 0)

- [x] 0.1 Vendored schemas — already done via `git_modules/abap-file-formats` submodule (pinned `5ed949a`); document the bump-to-sync workflow in the package AGENTS.md.
- [x] 0.2 Wire existing `scripts/generate-aff-schemas.ts` into `nx codegen adt-plugin-gcts` → `src/schemas/generated/{type}-v{n}.ts` typed models, one file per schema version.
- [ ] 0.3 AFF handler contract — gcts `createHandler` `toMetadata`/`fromMetadata` already is the contract; extend with `sourceExt`/`companions` declaration for source-bearing types. abapGit `toAffJson` stays a Wave-4 parity concern inside that plugin only.
- [x] 0.4 ajv-based schema-validation harness — shared `affValidate(type, json, version)` reading schemas from `git_modules/` + golden-fixture runner over the submodule's `examples/` (match example→schema by `formatVersion` field; `.docu.` files route to the docu companion schema). Emit-side round-trip tests that pass handler-emitted metadata through `affValidate` land with the generic emitters in Waves 1–3 (`tests/aff/generic-roundtrip.test.ts`).
- [x] 0.4a Route `.reps.`/`.func.` LIMU sub-object examples to their nested schemas (`fugr/func-v1.json` etc.) — currently counted but not schema-validated.
- [x] 0.5 `aff-coverage` nx target on `adt-plugin-gcts` — emits `type × [handler-kind, versions, body-fields, examples, schema-validated]` matrix; fails under threshold.

## 1. Enrich stubs — AFF families (Wave 1)

_All types below are already registered via `wave2-generic.ts`; "enrich"
means a dedicated handler emitting the full schema body._

- [ ] 1.1 AIF framework: `aifa` `aifd` `aiff` `aifi` `aifn` `aifp` `aifr`
- [ ] 1.2 eDocument: `edcc` `edck` `edcr` `edoi`
- [ ] 1.3 FLP / IAM / auth: `siad` `sito` `suco` `susi` `uiaf`
- [ ] 1.4 Notes: `ntta` `ntty`

## 2. Enrich stubs — metadata singletons (Wave 2)

- [ ] 2.1 `advc` `aobj` `apic` `aplo` `apob` `dcat` `dmon` `dobj`
- [ ] 2.2 `ilmb` `intm` `rvbc` `saia` `sco2` `sprv` `srvc` `sxtg`
- [ ] 2.3 `cfdf` (v2 — confirm multi-version envelope handling)

## 3. Enrich stubs — source-bearing / special (Wave 3)

- [ ] 3.1 `ddla` — `.acds` CDS source companion
- [ ] 3.2 `csnm` — `.csn` CSN source companion
- [ ] 3.3 `evto` `ints` `iwng` — derive file shape from each type's `examples/` dir first
- [ ] 3.4 `docu` — root-level `docu-v1.json` schema, no type dir (edge case)

## 4. AFF-JSON parity for covered types (Wave 4)

Per-type: `toAffJson` mapper (derived from `toAbapGit`, verified against
schema) + companion-file wiring + golden test.

- [ ] 4.1 OO family: `clas` `intf` `fugr` `prog` `enhc`
- [ ] 4.2 DDIC family: `doma` `dtel` `tabl` `ttyp` `enqu` `shlp` `dsfi`
- [ ] 4.3 RAP/CDS-adjacent: `srvb` `apis` `evtb` `uiad` `uipg` `uist` `cota`
- [ ] 4.4 Security/auth: `auth` `sush` `suso` `chkc` `chko` `chkv` `chdo`
- [ ] 4.5 Enhancements & misc: `enho` `enhs` `eeec` `nrob` `msag` `tran` `para` `sfpf` `xslt` `gsmp` `http` `nont` `ront` `sajc` `sajt` `scp1` `smbc` `smtg` `swcr` `bgqc` `cdbo` `vcls` `type` `devc`

## 5. Conformance hardening (Wave 5)

- [ ] 5.1 File-name grammar: sub-object (LIMU) segments, content-type segments (`testclasses`, `texts`), BCP47 language infix, `(nmspc)` bracket encoding.
- [ ] 5.2 `.properties` text files for text-bearing types.
- [ ] 5.3 `.ddic` / `.xdp` companion support (`tabl` DDIC source variant, `sfpf` XDP layout).
- [ ] 5.4 `fromAffJson` deserialize parity across all AFF-capable types (import direction).
- [ ] 5.5 Formatting enforcement: UTF-8, no BOM, LF, trailing newline, 2-space JSON indent — emit-side unit tests.
- [ ] 5.6 Multi-`formatVersion` handling (`fugr` v1–v3, `cfdf`/`sito`/`uiad` v2).
- [ ] 5.7 Docs: coverage matrix page, handler-authoring guide updated for `toAffJson`, AGENTS.md refresh.
- [ ] 5.8 CI gate: `aff-coverage` fails when coverage regresses or a covered type lacks schema validation.
