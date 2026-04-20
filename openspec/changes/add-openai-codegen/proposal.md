# Add OpenAPI → ABAP client codegen (`@abapify/openai-codegen`)

## Why

Consuming modern REST/JSON APIs (OpenAI, Petstore, etc.) from ABAP today requires hand-written, boilerplate-heavy clients. We want a **deterministic TypeScript-based generator** that reads an OpenAPI spec and emits a single zero-dependency ABAP class, 100% typed to the spec, that can be shipped into cloud-first SAP systems (BTP / Steampunk) through the existing `adt-cli` deploy flow — and tested against a live ABAP system in this monorepo's CI.

A prior LLM-driven attempt (`abapify/codygen`) showed that non-deterministic generation is hard to maintain. This change picks the opposite approach: **typed AST + pretty-printer**, like `ts.factory` for ABAP.

## What Changes

New packages:

- **`@abapify/abap-ast`** — zero-dependency typed AST nodes and pretty-printer for ABAP classes, interfaces, types, statements, and expressions. Foundation for deterministic code generation. No parser (yet); emission only.
- **`@abapify/openai-codegen`** — OpenAPI → ABAP class code generator. Uses `@apidevtools/swagger-parser` for `$ref` dereferencing + validation, then drives a typed planner → emitter pipeline that produces a single ABAP class per spec. Supports target profiles (`on-prem-classic`, `s4-onprem-modern`, `s4-cloud`) and output formats (`abapgit`, `gcts`).

New sample:

- **`samples/petstore3-client`** — end-to-end proof project. Vendored Petstore v3 OpenAPI spec, a `generate` script, committed generated ABAP (for both abapGit and gCTS layouts), smoke scripts for `adt abap run`, and an ABAP Unit test class. Deployed to the `TRL` ABAP Cloud system in CI.

Scope of first version (`s4-cloud` target only, the others are designed-for but not emitted in v1):

- Full JSON Schema 2020-12 subset: primitives, objects, arrays, enums, `$ref`, `allOf` (flatten/INCLUDE), `oneOf`/`anyOf` with discriminator, nullable.
- All Operation object fields: parameters (path/query/header/cookie with `style`/`explode`), `requestBody`, `responses` (2xx typed return / 4xx/5xx → generated `ZCX_…_ERROR`), `security`, `servers`, `tags`, `deprecated`.
- Security: `apiKey`, `http bearer`, `http basic`. `oauth2` / `openIdConnect` via overridable `ON_AUTHORIZE` hook.
- Inline JSON runtime (tokenizer + per-type serializer/deserializer) emitted into the generated class — no `/ui2/cl_json` or `xco_cp_json` runtime dependency, satisfying Steampunk's whitelist.

Out of scope for v1 (tracked as follow-up):

- `on-prem-classic` and `s4-onprem-modern` runtime emission (the profile definitions exist but aren't wired yet).
- OpenAPI webhooks, callbacks, and full OAuth2 flows.
- Streaming / SSE responses.
- `.aclass` DSL parser (will live under `@abapify/abap-ast` when it's added).

## Affected packages

- **new** `packages/abap-ast/` — AST + printer.
- **new** `packages/openai-codegen/` — generator + CLI.
- **new** `samples/petstore3-client/` — E2E fixture and deployment target.
- **modified** `adt.config.ts` — no change required (codegen is a bun CLI, not an `adt` subcommand).
- **touched** `AGENTS.md` — add new packages to the dependency graph section.

## Architectural impact

New leaf packages with no upstream dependencies inside the monorepo:

```
@abapify/abap-ast               (zero deps)
@abapify/openai-codegen ─► @abapify/abap-ast
samples/petstore3-client ─► @abapify/openai-codegen (build-time only)
```

Cloud profile constraint drives one subtle design decision: the generated ABAP must only reference kernel classes on the Steampunk whitelist. `@apidevtools/swagger-parser` stays as a TS **dev / CLI-time** dependency — it never reaches ABAP output.

## Testing & rollback

- Unit: AST printer snapshots, JSON-Schema → ABAP type-mapping matrix, OpenAPI operation → method emission.
- Fixture: regenerate `samples/petstore3-client/generated/**/*.abap` and assert it matches committed output (`git diff --exit-code`).
- E2E: deploy the generated `ZCL_PETSTORE3_CLIENT` to `TRL` via `adt-cli`, run an `adt abap run` smoke snippet, and execute the generated ABAP Unit test class via `adt aunit`.
- Rollback: pure additive change. Deleting the three new directories restores previous behaviour; nothing else depends on them.
