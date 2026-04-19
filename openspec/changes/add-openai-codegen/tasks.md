# Tasks — `add-openai-codegen`

Waves reflect subagent parallelism. Each task lists the package(s) it touches so waves don't collide.

## Wave 0 — scaffold (sequential, done by lead)

- [x] Create `packages/abap-ast` skeleton (package.json, tsconfig, tsdown, vitest, eslint, `src/index.ts`).
- [x] Create `packages/openai-codegen` skeleton (same template + CLI entry).
- [x] Create `samples/petstore3-client` with vendored `spec/openapi.json`.
- [x] Install workspace deps (`bun install`), verify `bunx nx build` succeeds on empty packages.
- [x] Create this OpenSpec change document.
- [x] Feature branch `feat/openai-codegen-abap` off `main`.

## Wave 1 — foundations (parallel subagents)

- [ ] **abap-ast #1** — node types + factories: `ClassDef`, `InterfaceDef`, `TypeDef`, `TypeRef`, `Section`, `MethodDef`, `MethodParam`, `DataDecl`, `Statement` (assignment / call / raise / if / loop / try / return), `Expr` (literal / identifier / call / binop), `Comment`. Package `packages/abap-ast/src/nodes/`.
- [ ] **openai-codegen #1** — OAS loader & normalizer: wrap `@apidevtools/swagger-parser`, dereference, hoist path-level parameters into operations, collect 2xx / 4xx-5xx response buckets, normalize media types. `packages/openai-codegen/src/oas/`.
- [ ] **openai-codegen #2** — target profiles & class whitelist for `s4-cloud` only (others are type stubs with `TODO`). `packages/openai-codegen/src/profiles/`.

## Wave 2 — emitters (parallel, depend on Wave 1)

- [ ] **abap-ast #2** — pretty-printer + snapshot tests for every node kind in `tests/printer.test.ts`. Deterministic: 2-space indent, UPPER keywords, stable ordering within sections.
- [ ] **openai-codegen #3** — type planner + emitter: JSON Schema → `TypeDef` AST (primitives, array, object, enum, `$ref`, `allOf` flatten, `oneOf`/`anyOf` with discriminator, nullable-as-flag). Includes stable-id allocator (≤30 chars + hash suffix). Tests: mapping matrix per schema shape.
- [ ] **openai-codegen #4** — inline JSON runtime: ABAP fragments (tokenizer + type-specific ser/de) emitted into the class for `s4-cloud`. Stored as plain `.abap` templates under `src/runtime/s4-cloud/` and assembled by the emitter.

## Wave 3 — integration (parallel)

- [ ] **openai-codegen #5** — operation emitter: operationId → `MethodDef`; parameter serialization per `style`/`explode`; request body; response routing (typed 2xx return, `RAISING ZCX_…_ERROR` for 4xx/5xx); local exception class.
- [ ] **openai-codegen #6** — security schemes: `apiKey`, `http bearer`, `http basic` auto-injection; constructor wiring; OAuth2 `ON_AUTHORIZE` hook stub.
- [ ] **openai-codegen #7** — CLI (`commander`): `openai-codegen --input --out --target --format --class-name --type-prefix`; deterministic stdout; non-zero exit on spec validation errors.
- [ ] **openai-codegen #8** — format plugins: emit abapGit layout (`.clas.abap` + `.clas.xml` + devc manifest) and gCTS layout. No new runtime deps required — only TS emission of package layouts.

## Wave 4 — E2E on live TRL (sequential, single agent)

- [ ] Generate `samples/petstore3-client/generated/{abapgit,gcts}`; commit results.
- [ ] `bunx adt deploy samples/petstore3-client/generated/abapgit --package $TMP --system TRL`.
- [ ] Smoke: `bunx adt abap run samples/petstore3-client/e2e/smoke.abap` — instantiate the generated client, call `GET /pet/findByStatus`, print first pet name.
- [ ] Deploy ABAP Unit test class `ZCL_PETSTORE3_CLIENT_TESTS` (hand-written, hits a live path and asserts shape).
- [ ] `bunx adt aunit zcl_petstore3_client_tests` — must pass with 0 failures.
- [ ] Regression: `bunx nx test abap-ast openai-codegen` green; `git diff samples/petstore3-client/generated/` empty after re-running `bun run generate`.

## Wave 5 — verification & PR

- [ ] `bunx nx run-many -t build,test,typecheck,lint -p abap-ast,openai-codegen`
- [ ] `bunx nx format:write`
- [ ] Update root `AGENTS.md` dependency graph.
- [ ] `AGENTS.md` per package (abap-ast, openai-codegen) with conventions.
- [ ] Commit waves as separate commits; push feature branch; open PR with summary + test plan + generated-artifact diff stats.
