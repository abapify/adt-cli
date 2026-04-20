# Tasks — `add-openai-codegen` (v2)

Waves reflect subagent parallelism. Each task lists the package(s) it touches so waves don't collide.

## Wave 0 — scaffold (sequential, lead)

- [x] Create `packages/abap-ast` skeleton (package.json, tsconfig, tsdown, vitest, eslint, `src/index.ts`).
- [x] Create `packages/openai-codegen` skeleton (same template + CLI entry).
- [x] Create `samples/petstore3-client` with vendored `spec/openapi.json`.
- [x] Install workspace deps (`bun install`), verify `bunx nx build` succeeds on empty packages.
- [x] Create this OpenSpec change document.
- [x] Feature branch `feat/openai-codegen-abap` off `main`.

## Wave 1 — foundations + Layer-1/2 emitters (7 parallel subagents)

- [x] **abap-ast #ABAPDoc** — extend declaration nodes (`TypeDef`, `MethodDef`, `AttributeDef`, `InterfaceDef`, `ClassDef`) with an optional `readonly abapDoc: readonly string[]` field; teach the printer to emit each line verbatim with a `"! ` prefix at the declaration's indentation. Snapshot tests for every shape.
- [x] **openai-codegen #naming** — `NamesConfig` type, defaults (`ZIF_<base>_TYPES`, `ZIF_<base>`, `ZCX_<base>_ERROR`, `ZCL_<base>`, locals `json`/`lcl_http`/`lcl_response`/`lcl_json_parser`), CLI flag wiring (`--types-interface`, `--operations-interface`, `--exception-class`, `--implementation-class`, `--local-http-class`, `--local-response-class`, `--local-json-parser-class`, `--local-json-class`), validation + collision detection.
- [x] **openai-codegen #types-intf** — Layer-1 emitter: OpenAPI schemas → `InterfaceDef` with `TYPES:` entries, topological ordering, `"! @openapi-schema <OriginalName>` on every entry, `"! @openapi-ref` on `$ref`-derived fields.
- [x] **openai-codegen #ops-intf** — Layer-2 emitter: operations → `InterfaceDef` with `METHODS:` per op, typed via Layer 1, `"! @openapi-operation` + `"! @openapi-path VERB /path` on every method.
- [x] **openai-codegen #exception** — `ZCX_<base>_ERROR` emitter: standard exception class carrying `status`, `body`, `operation_id` attributes + constructor.
- [x] **openai-codegen #locals** — `zcl_<base>.clas.locals_def.abap` + `zcl_<base>.clas.locals_imp.abap` templates for `json`, `lcl_http`, `lcl_response`, `lcl_json_parser`. Names injected via `NamesConfig`. `lcl_http->fetch` signature mirrors `abapify/fetch`; `json=>` API mirrors `abapify/json`.
- [x] **openai-codegen #response-mapper** — helper that, given an operation's `responses`, produces the AST fragments for the `CASE response->status( )` block (typed returns + `ZCX_<base>_ERROR RAISE`).

## Wave 2 — Layer-3 + pipeline (3 parallel subagents)

- [x] **openai-codegen #impl** — Layer-3 emitter: `ZCL_<base>` with one private `client TYPE REF TO lcl_http` attribute, a constructor, and one method per operation whose body is `client->fetch( … )` + `CASE response->status( ) … ENDCASE` (delegating to #response-mapper). Zero references to per-operation types inside `lcl_http`.
- [x] **openai-codegen #format** — `format/index.ts` `InterfaceArtifact`/`ClassArtifact`/`DevcArtifact` model + `writeClientBundle(dir, artifacts)` that writes the 11-file abapGit layout; `<ABAP_LANGUAGE_VERSION>5</ABAP_LANGUAGE_VERSION>` in every VSEOCLASS/VSEOINTERF for Steampunk compatibility.
- [x] **openai-codegen #generate** — `generate.ts` pipeline wiring (`oas → naming → emit/types-interface → emit/operations-interface → emit/exception-class → emit/implementation-class → emit/local-classes → format/writeClientBundle`) + `cli.ts` flag plumbing + deterministic-output assertion.

## Wave 3 — sample, docs, openspec refresh (3 parallel subagents)

- [x] **sample** — regenerate `samples/petstore3-client/generated/abapgit/` (11 files); hand-write AUnit test class; update `samples/petstore3-client/e2e/README.md` with the live BTP Steampunk workflow (`adt-cli deploy … --package <user-owned Z pkg>` then `adt aunit`).
- [ ] **docs** — update `packages/abap-ast/README.md`, `packages/openai-codegen/README.md`, their `AGENTS.md` files, the website page, and the `.agents/rules/` / skill entry for openai-codegen.
- [ ] **openspec** — this task: rewrite proposal/tasks/spec for v2 + extend `abap-ast` spec with the ABAPDoc requirement.

## Wave 4 — verification + PR (sequential, lead)

- [ ] `bunx nx run-many -t build,test,typecheck,lint -p abap-ast,openai-codegen`
- [ ] `bunx nx format:write`
- [ ] Abaplint parse check against `samples/petstore3-client/generated/abapgit/` (0 fatal errors).
- [ ] `git diff samples/petstore3-client/generated/` empty after re-running `bun run generate`.
- [ ] Live deploy to BTP Steampunk via `adt-cli deploy … --package <user-owned Z pkg>` and `adt aunit` green.
- [ ] Update root `AGENTS.md` dependency graph.
- [ ] Commit waves as separate commits; push feature branch; open/update PR with summary + test plan + generated-artifact diff stats.
