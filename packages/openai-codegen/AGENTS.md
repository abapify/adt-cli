# openai-codegen — AI Agent Guide

## Package Overview

**Deterministic OpenAPI → ABAP client generator.** Reads an OpenAPI 3.x
spec, builds a typed AST via `@abapify/abap-ast`, and writes a single
zero-runtime-dependency ABAP class per spec, packaged as abapGit or gCTS.

| Item          | Value                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------ |
| Runtime deps  | `@abapify/abap-ast`, `@apidevtools/swagger-parser`, `commander`, `fast-xml-parser`, `yaml` |
| Dev deps      | `@abaplint/core` (for parse-check tests)                                                   |
| Language      | TypeScript 5 strict ESM                                                                    |
| Build         | `bunx nx build openai-codegen` (tsdown)                                                    |
| Test runner   | `bunx nx test openai-codegen` (vitest)                                                     |
| CLI binary    | `openai-codegen` → `dist/cli.mjs`                                                          |
| Library entry | `src/index.ts` → `generate()` + per-module re-exports                                      |

## Architecture

```
CLI (src/cli.ts) ─┐
                  ├─► generate() (src/generate.ts)
Library caller ───┘        │
                           ▼
                 oas/ ── load + dereference + normalize ──► NormalizedSpec
                 profiles/ ── pick target profile ────────► TargetProfile
                 types/ ── plan TypeDefs (topological) ───► TypePlan
                 runtime/ ── pick inline ABAP helpers ─────► CloudRuntime
                 emit/ ── assemble ClassDef + extras ──────► { class, extras }
                           │
                           ▼
                 @abapify/abap-ast print()
                           │
                           ▼
                 generate.ts ── injectRuntime + stripLineComments
                           │
                           ▼
                 format/ ── writeLayout (abapGit | gCTS) ──► files[]
```

## Per-subdirectory responsibilities

### `src/oas/`

Normalise the raw OpenAPI document into the shape the rest of the pipeline
expects. **Must not leak `swagger-parser` types** past this boundary.

| File         | Responsibility                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `types.ts`   | `NormalizedSpec`, `NormalizedOperation`, `NormalizedParameter`, `NormalizedRequestBody`, `NormalizedResponse`, `NormalizedServer`, `JsonSchema`. |
| `load.ts`    | `loadSpec()` (file/URL/object), `normalizeSpec()` (operations list, servers, security).                                                          |
| `iterate.ts` | `walkSchemas()`, `operationKey()` — stable keys for the planner.                                                                                 |
| `index.ts`   | Barrel.                                                                                                                                          |

### `src/profiles/`

Target SAP system definitions. Whitelist enforcement lives here.

| File                | Responsibility                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `types.ts`          | `TargetProfileId`, `TargetProfile`, `HttpClientStrategy`, `JsonStrategy`.                |
| `cloud.ts`          | `s4CloudProfile` — the only v1-implemented profile; carries the kernel-class allow-list. |
| `onprem-modern.ts`  | `s4OnPremModernProfile` — declared but not emitted (TODO).                               |
| `onprem-classic.ts` | `onPremClassicProfile` — declared but not emitted (TODO).                                |
| `errors.ts`         | `WhitelistViolationError`.                                                               |
| `registry.ts`       | `getProfile()`, `assertClassAllowed()`, `ALL_PROFILES`.                                  |
| `index.ts`          | Barrel.                                                                                  |

### `src/types/`

JSON Schema → ABAP `TypeDef` planning and mapping.

| File        | Responsibility                                                                        |
| ----------- | ------------------------------------------------------------------------------------- |
| `naming.ts` | `sanitizeIdent()`, `makeNameAllocator()` — collision-safe lowercase ABAP names.       |
| `plan.ts`   | `planTypes()` — topological sort of component + inline schemas; returns `TypePlan`.   |
| `map.ts`    | `mapPrimitive`, `mapSchemaToTypeRef`, `mapSchemaToTypeDef` — the schema → AST mapper. |
| `emit.ts`   | `emitTypeSection()` — plan → `TypeDef[]` in dependency order.                         |
| `errors.ts` | `CyclicTypeError`, `CollisionError`, `UnsupportedSchemaError`.                        |
| `index.ts`  | Barrel.                                                                               |

### `src/runtime/s4-cloud/`

Hand-written ABAP snippets that get injected into the generated class. These
are **raw strings**, not AST. They live here because the AST has no
representation for raw ABAP blocks and we deliberately avoid round-tripping
them through a parser.

| File           | Responsibility                                             |
| -------------- | ---------------------------------------------------------- |
| `http.abap.ts` | `if_web_http_client` send/receive helper.                  |
| `url.abap.ts`  | Path/query encoding helpers.                               |
| `json.abap.ts` | Inline JSON tokenizer + reflective (de)serialisation.      |
| `index.ts`     | `getCloudRuntime()` → `{ declarations, implementations }`. |

### `src/emit/`

Turn `NormalizedOperation` + `TypePlan` + `TargetProfile` into AST nodes.

| File                 | Responsibility                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `identifiers.ts`     | Stable ABAP names (method, param, attribute, exception class) via `NameAllocator`.            |
| `parameters.ts`      | `buildImportingParams`, `translateParameter`, `translateRequestBody`, `pickRequestMediaType`. |
| `responses.ts`       | `pickSuccessResponse`, `buildReturning`, `buildRaising`.                                      |
| `operation-body.ts`  | `buildOperationBody()` — the per-method `METHOD … ENDMETHOD` body.                            |
| `security.ts`        | `emitSecuritySupport`, `collectUsedSchemes`.                                                  |
| `server.ts`          | `emitServerConstants`, `emitServerCtorParams`, `resolveServerUrl`.                            |
| `exception-class.ts` | `buildExceptionClass()` — the `ZCX_*_ERROR` `LocalClassDef` (promoted to global on write).    |
| `assemble.ts`        | `emitClientClass()` + `sanitizeStarComments()` — the top-level assembler.                     |
| `index.ts`           | Barrel.                                                                                       |

### `src/format/`

Disk layout writers + envelope emitters.

| File          | Responsibility                                                                  |
| ------------- | ------------------------------------------------------------------------------- |
| `types.ts`    | `OutputFormat`, `ClassArtifact`, `WriteResult`.                                 |
| `abapgit.ts`  | Canonical abapGit layout (`src/*.clas.abap` + `.clas.xml`, `package.devc.xml`). |
| `gcts.ts`     | AFF-style gCTS layout (`CLAS/<name>/*.clas.abap` + `.clas.json`).               |
| `validate.ts` | Filename + class-name sanity checks.                                            |
| `index.ts`    | `writeLayout()` dispatcher.                                                     |

### `src/generate.ts`

Orchestrates the pipeline and owns the post-printer steps:
`injectRuntime()` (splices the inline runtime at section boundaries) and
`stripLineComments()` (Steampunk rejects standalone `"` line comments in
structural positions). Also patches the printed `LocalClassDef` header of
each extra exception class to `PUBLIC CREATE PUBLIC` so it is valid as a
global class file.

### `src/cli.ts`

Thin commander wrapper over `generate()`. Validates `--target` and
`--format`, supports comma-separated multi-format output, prints a
one-liner summary per format to stdout, errors to stderr with a non-zero
exit code.

### `src/index.ts`

Public barrel. Re-exports `oas`, `profiles`, `types`, `runtime`, `emit`,
`format`, and `generate`.

## Invariants

1. **No new runtime deps in emitted ABAP.** The generated class may only
   call kernel classes listed in `s4CloudProfile.allowedClasses`. Any new
   emitter that introduces a class reference must add it to the whitelist
   AND the whitelist must be checked at emit time, not after the fact.
2. **AST is the only source of ABAP structure.** The sole exception is the
   inline runtime, spliced as pre-formatted strings at the `PRIVATE
SECTION` / `IMPLEMENTATION` closing `ENDCLASS.` boundaries by
   `injectRuntime()`. Do NOT introduce string splicing anywhere else;
   extend the AST in `@abapify/abap-ast` instead.
3. **Schema TypeDefs go to the PUBLIC SECTION.** Callers need to name
   generated types (`ty_<prefix>_<schema>`) from their own code, so all
   plan-derived `TypeDef`s are emitted as public members of the main
   class.
4. **No standalone `"` line comments in written source.**
   `stripLineComments()` runs after print and removes them. If a generator
   path "needs" a line comment for future tooling, attach it as a trailing
   comment on a code line instead, or fold it into the structured AST via
   a `Comment` node.
5. **`ZCX_*` is a separate global class file.** The error exception is
   built as a `LocalClassDef`, printed, then rewritten to
   `CLASS … DEFINITION PUBLIC CREATE PUBLIC` and written as its own
   `.clas.abap` + envelope.
6. **Generated `.clas.xml` / `.clas.json` carry `ABAP_LANGUAGE_VERSION=5`.**
   This is the Cloud value; without it, Steampunk import fails with a
   language-version mismatch.
7. **Output is deterministic.** `result.files` is sorted + deduped; the
   printer is deterministic (see `@abapify/abap-ast/AGENTS.md`); the
   envelope writers use stable key ordering.

## Adding a new target profile

1. Create `src/profiles/<id>.ts` exporting a `TargetProfile` (id, http
   strategy, json strategy, `allowedClasses`).
2. Register it in `src/profiles/registry.ts` (`PROFILES`, `ALL_PROFILES`).
3. Add the id to `TargetProfileId` in `src/profiles/types.ts`.
4. If the profile needs a new runtime, add
   `src/runtime/<profile>/{http,url,json}.abap.ts` + an `index.ts`
   exporting `get<Profile>Runtime(): CloudRuntime`.
5. Teach `generate.ts` to pick the right runtime (today it short-circuits
   on `target !== 's4-cloud'` — replace that with a dispatcher).
6. Update `cli.ts` — `parseTarget()` already accepts all three ids, but
   verify the error paths.
7. Add a parse-check test: generate a small spec against the new profile
   and feed the source through `@abaplint/core`.

## Adding a new JSON-Schema → ABAP mapping rule

1. Start in `src/types/map.ts`. `mapPrimitive()` for new primitive
   `type`/`format` pairs; `mapSchemaToTypeRef()` / `mapSchemaToTypeDef()`
   for composite shapes.
2. If the new shape introduces a name (enum values, union branches, inline
   objects), allocate it via the planner's `NameAllocator` in
   `src/types/plan.ts`.
3. Extend the unit tests in `tests/types-emit.test.ts` with:
   - The happy-path mapping.
   - An explicit `UnsupportedSchemaError` case if the shape has gaps.
4. Update the type-mapping table in `README.md`.

## Extending the operation emitter

- New OpenAPI operation field → thread through `NormalizedOperation` in
  `src/oas/types.ts` and `normalizeSpec()` in `load.ts`.
- New ABAP parameter / statement shape → extend the relevant module in
  `src/emit/` (`parameters.ts`, `responses.ts`, `operation-body.ts`).
- If the emitter needs a new ABAP construct, add it to `@abapify/abap-ast`
  first (new node kind + printer), then consume it from the emitter —
  never reach for string concatenation.
- Any new kernel-class reference MUST be added to
  `s4CloudProfile.allowedClasses` and covered by a test that asserts the
  generated source still passes parse-check.

## Testing

- Unit tests live under `tests/` (`oas`, `types-emit`, `emit`, `format`,
  `profiles`, `runtime`) and use `vitest` with inline snapshots where the
  snapshot itself is the spec.
- **Parse-check expectation.** Any emitter that can affect the final
  source MUST have at least one test that feeds the concatenated source
  (`GenerateResult.source`) through `@abaplint/core` and asserts zero
  fatal errors. This is our gate against generating invalid ABAP that
  would only fail on a live SAP system.
- The fixture-diff against `samples/petstore3-client/generated/**` is the
  end-to-end regression check — regenerate and assert `git diff
--exit-code`.

## End-to-end deploy note

When manually testing against a live BTP tenant:

- Use a **user-writable package** (e.g. `ZMY_PACKAGE` in a tenant you
  control). Do not target `$TMP` on BTP unless your role grants
  `S_ABPLNGVS` for that language version — import will otherwise fail
  with a language-version authorisation error.
- The authoritative procedure lives at
  [`samples/petstore3-client/e2e/README.md`](../../samples/petstore3-client/e2e/README.md).
  Keep that README as the single source of truth; do not duplicate steps
  here.

## Build commands

```bash
bunx nx build openai-codegen       # tsdown → dist/{index,cli}.mjs
bunx nx test openai-codegen        # vitest
bunx nx typecheck openai-codegen   # tsc --noEmit
bunx nx lint openai-codegen
```
