# openai-codegen — AI Agent Guide

## Package Overview

**Deterministic OpenAPI → ABAP client generator (v2 pipeline).** Reads
an OpenAPI 3.x spec, builds typed ABAP ASTs via `@abapify/abap-ast`, and
writes **four global artifacts** plus a bundled set of local helpers:

- `ZIF_<BASE>_TYPES` — global interface holding every schema as ABAP
  `TYPES`, with round-trip `@openapi-schema` / `@openapi-ref` ABAPDoc
  markers.
- `ZIF_<BASE>` — global interface holding every operation as typed
  `METHODS`, `RAISING` the exception class; types are referenced via
  `zif_<name>_types=>…`.
- `ZCX_<BASE>_ERROR` — global exception class inheriting
  `cx_static_check`, carrying `status`, `description`, `body`,
  `headers`.
- `ZCL_<BASE>` — thin implementation class. One private attribute
  (`client TYPE REF TO lcl_http`). Each method body is one `fetch` call
  plus a `CASE response->status( )` block.
- `zcl_<base>.clas.locals_def.abap` / `locals_imp.abap` — bundled helper
  locals: `lcl_http`, `lcl_response`, `json`, `lcl_json_parser`.
  Zero Z-dependencies; kernel APIs only.

Writing layouts supported: `abapgit` (11 files) and `gcts`.

| Item          | Value                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------ |
| Runtime deps  | `@abapify/abap-ast`, `@apidevtools/swagger-parser`, `commander`, `fast-xml-parser`, `yaml` |
| Dev deps      | `@abaplint/core` (parse-check)                                                             |
| Language      | TypeScript 5 strict ESM                                                                    |
| Build         | `bunx nx build openai-codegen`                                                             |
| Test runner   | `bunx nx test openai-codegen` (vitest)                                                     |
| CLI binary    | `openai-codegen` → `dist/cli.mjs`                                                          |
| Library entry | `src/index.ts` → `generate()` + module re-exports                                          |

## Architecture

```text
loadSpec (oas/) ─► NormalizedSpec
planTypes (types/) ─► TypePlan (topological, cycle-broken with REF TO data)
resolveNames (emit/naming.ts) ─► ResolvedNames
        │
        ├─► emitTypesInterface       (ZIF_<BASE>_TYPES AST)
        ├─► emitOperationsInterface  (ZIF_<BASE>    AST)
        ├─► emitExceptionClass       (ZCX_<BASE>_ERROR AST)
        ├─► emitImplementationClass  (ZCL_<BASE>   AST — thin)
        └─► emitLocalClasses         (locals_def + locals_imp — templated)
                │
                ▼
        @abapify/abap-ast print()        (4 × deterministic prints)
                │
                ▼
        writeClientBundle (format/)      (abapgit | gcts layout + envelopes)
```

## Per-subdirectory responsibilities

### `src/oas/`

OpenAPI loader + normalizer. Produces `NormalizedSpec` — the only shape
the rest of the pipeline consumes. Must not leak `swagger-parser`
types past this boundary.

| File         | Responsibility                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------------- |
| `types.ts`   | `NormalizedSpec`, `NormalizedOperation`, `NormalizedParameter`, `NormalizedResponse`, `JsonSchema`. |
| `load.ts`    | `loadSpec()` (file/URL/object) + normalization.                                                     |
| `iterate.ts` | `walkSchemas()`, stable `operationKey()`.                                                           |
| `index.ts`   | Barrel.                                                                                             |

### `src/types/`

JSON Schema → ABAP `TypeDef` planning.

| File        | Responsibility                                                         |
| ----------- | ---------------------------------------------------------------------- |
| `naming.ts` | `sanitizeIdent()`, `makeNameAllocator()` — collision-safe ABAP names.  |
| `plan.ts`   | `planTypes()` — topological sort; back-edges broken via `REF TO data`. |
| `map.ts`    | `mapPrimitive`, `mapSchemaToTypeRef`, `mapSchemaToTypeDef`.            |
| `errors.ts` | `CyclicTypeError`, `CollisionError`, `UnsupportedSchemaError`.         |
| `index.ts`  | Barrel.                                                                |

### `src/profiles/`

Target profile registry. Only `s4-cloud` emits in v1; the other ids
exist as slots for future runtimes.

| File                | Responsibility                              |
| ------------------- | ------------------------------------------- |
| `types.ts`          | `TargetProfileId`, `TargetProfile`.         |
| `cloud.ts`          | `s4CloudProfile` (kernel-class allow-list). |
| `onprem-modern.ts`  | Stub — declared, not emitted.               |
| `onprem-classic.ts` | Stub — declared, not emitted.               |
| `registry.ts`       | `getProfile()`, `assertClassAllowed()`.     |
| `errors.ts`         | `WhitelistViolationError`.                  |

### `src/emit/naming.ts`

Single source of truth for all generated global + local names.
`resolveNames(NamesConfig)` validates ABAP identifier rules (Z/Y prefix,
length ≤ 30, charset) and returns a `ResolvedNames` record used by every
emitter downstream. Base-derived defaults:

- `ZIF_<BASE>_TYPES`, `ZIF_<BASE>`, `ZCL_<BASE>`, `ZCX_<BASE>_ERROR`
- locals: `lcl_http`, `lcl_response`, `json`, `lcl_json_parser`

### `src/emit/types-interface.ts` (Layer 1)

Builds an `InterfaceDef` whose members are plan-ordered `TypeDef`s with
ABAPDoc markers. Handles:

- Primitive → ABAP mapping (`string`, `int8`, `timestampl`, …).
- `object` → `BEGIN OF … END OF`.
- `array` → `STANDARD TABLE OF <row> WITH EMPTY KEY`.
- `additionalProperties` → `_map` table rows of `{ key, value }`.
- `allOf` → flattened structure.
- `oneOf` / `anyOf` → union merge (all branch fields, optional
  semantics).
- Cyclic back-edges → field typed `REF TO data` with `"! @openapi-ref
<field>:<Target>`.
- Every type carries `"! @openapi-schema <SourceName>`.

### `src/emit/operations-interface.ts` (Layer 2)

Builds an `InterfaceDef` whose members are `MethodDef`s referencing
types as `zif_<base>_types=>…`. Each method carries:

- `"! @openapi-operation <operationId>`
- `"! @openapi-path <VERB> <path>`
- `"! <summary>` (if present)

Returns the parsed operation list so the implementation emitter can
generate method bodies without reparsing.

### `src/emit/exception-class.ts`

Emits `ZCX_<BASE>_ERROR` inheriting `cx_static_check`, with `status`,
`description`, `body`, `headers` attributes and a matching constructor.

### `src/emit/implementation-class.ts` (Layer 3)

Minimal `ClassDef`:

- Public section: `constructor( destination, server = '<path>' )` where
  the default comes from `spec.servers[0].url` (path component) or `/`.
- Private section: exactly one `DATA client TYPE REF TO lcl_http`.
- One method impl per operation — delegates the body to
  `response-mapper.ts`.

No private helper methods. No state beyond `client`.

### `src/emit/response-mapper.ts`

Builds the per-operation `METHOD … ENDMETHOD` body:

1. `DATA(response) = client->fetch( method = '…' path = |…| [query = …]
[headers = …] [body = json=>stringify( body )] ).`
2. `CASE response->status( ). WHEN <success>. json=>parse( response->body(
) )->to( REF #( <retVar> ) ). WHEN <code1>. RAISE … WHEN OTHERS.
RAISE … ENDCASE.`

### `src/emit/local-classes.ts` + `src/emit/templates/`

The helper-locals bundle. Templates live as TypeScript string exports
(`locals-def.abap.ts`, `locals-imp.abap.ts`) and get parameterised with
the resolved local class names. The bundle exposes:

- `lcl_http` — HTTP transport wrapping `cl_web_http_client_manager` +
  `cl_http_destination_provider`. Only kernel exceptions propagate
  (`cx_web_http_client_error`, `cx_http_dest_provider_error`).
- `lcl_response` — status / body / text / header / headers accessors.
- `json` — `stringify` / `render` / `parse->to( REF #( … ) )` (mirrors
  the `abapify/json` surface).
- `lcl_json_parser` — internal JSON walker used by `json`.

### `src/format/`

On-disk writers.

| File          | Responsibility                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `types.ts`    | `InterfaceArtifact`, `ClassArtifact`, `ClientBundle`, `WriteResult`.                                   |
| `abapgit.ts`  | abapGit layout (`src/*.clas.abap` + `.clas.xml`, `src/*.intf.abap` + `.intf.xml`, `package.devc.xml`). |
| `gcts.ts`     | AFF/gCTS layout (`CLAS/<name>/…`, `INTF/<name>/…`, JSON envelopes).                                    |
| `envelope.ts` | `VSEOCLASS` / `VSEOINTERF` emit with `ABAP_LANGUAGE_VERSION=5`.                                        |
| `index.ts`    | `writeClientBundle({ types, operations, exception, implementation }, format, outDir)`.                 |

### `src/generate.ts`

Pipeline entry point. Orchestrates load → plan → resolveNames → five
emitters → four prints → write. Tags each step in thrown errors
(`openai-codegen generate failed at step "<step>": …`).

### `src/cli.ts`

Commander wrapper over `generate()`. Flags: `--input`, `--out`,
`--base`, `--types-interface`, `--operations-interface`, `--class-name`,
`--exception-class`, `--format`, `--target`, `--description`. Supports
comma-separated `--format abapgit,gcts`; each lands in its own
subdirectory.

### `src/index.ts`

Public barrel — `generate`, `NamesConfig`, `ResolvedNames`,
`resolveNames`, plus every subdirectory re-export so callers can drive
individual pipeline steps.

## Invariants

1. **Schema TYPES live on the types interface, never on the class.**
   ABAP's unified component namespace for types / attributes / methods
   on a class would force name mangling. Keep
   `ZIF_<BASE>_TYPES` as the only home for schema types. Operations
   reference them via `zif_<base>_types=>…`.
2. **Transport is JSON-blind.** `lcl_http->fetch` knows nothing about
   JSON, status codes, or operation identities. It accepts `body` as
   `string` (+ optional `binary` as `xstring`), returns an
   `lcl_response`, and only propagates kernel exceptions. All mapping
   (success decode, error dispatch) happens in the per-operation method
   in `ZCL_<BASE>`.
3. **JSON API matches `abapify/json`.** `json=>stringify( data )` returns
   `string`, `json=>render( data )` returns `xstring`, `json=>parse(
any )->to( REF #( target ) )` fills the target by reference.
   Internally wraps `/ui2/cl_json` + `cl_abap_conv_codepage`.
4. **All 4 global + 4 local names are configurable.** `resolveNames()`
   is the only place that decides final names. It validates against
   ABAP identifier rules (`^[ZY][A-Z0-9_]*$` for globals, length ≤ 30;
   `^[a-z][a-z0-9_]*$` for locals).
5. **Generated source parses under `@abaplint/core`.** Any emitter
   change MUST be covered by a test that feeds the concatenated output
   through `@abaplint/core` with zero fatal errors.
6. **`ABAP_LANGUAGE_VERSION=5` in every envelope.** `VSEOCLASS` and
   `VSEOINTERF` carry `<ABAP_LANGUAGE_VERSION>5</ABAP_LANGUAGE_VERSION>`;
   without it, Steampunk import fails with a language-version mismatch.
7. **No standalone `"` line comments in written source.** ADT rejects
   them structurally. Strip at emit time; prefer ABAPDoc (`"!`) or
   trailing comments on code lines instead.
8. **ZCX is its own global class file.** Do NOT concatenate it into the
   main class; it must be a separate `.clas.abap` artifact with its
   own envelope.
9. **Output is deterministic.** Sorted file list, stable key ordering
   in envelopes, and `@abapify/abap-ast` determinism give byte-for-byte
   identical output on re-run.

## How to add …

### A new JSON-Schema → ABAP mapping rule

1. Extend `src/types/map.ts` — keep it pure `JsonSchema → AbapTypeRef /
AbapTypeDef`.
2. If the new shape introduces a named type, allocate via the planner's
   `NameAllocator` in `src/types/plan.ts`.
3. If it may introduce a cycle, verify the back-edge path: the planner
   emits `REF TO data` + `"! @openapi-ref` on back-edges. Add a fixture.
4. Add a test in `tests/types-emit.test.ts` asserting both the AST shape
   and the printed ABAP.
5. Update the mapping table in `README.md`.

### A new target profile

1. Create `src/profiles/<id>.ts` with a `TargetProfile` (id, HTTP
   strategy, allowed kernel classes, ABAP language version).
2. Register in `src/profiles/registry.ts`.
3. Teach `generate.ts` to dispatch past the current `assertSupportedTarget`
   short-circuit.
4. The locals bundle in `src/emit/templates/` is shared; branch only if
   the new profile needs a different kernel class (e.g. `cl_http_client`
   for classic on-prem).
5. Add a parse-check test.

### A new CLI flag

1. Extend `RawCliOptions` + `buildCliRunOptions` in `src/cli.ts`.
2. Thread through to `GenerateOptions` in `src/generate.ts` if it
   affects emission.
3. Add help text and a test in the CLI test suite.

### A new ABAPDoc tag

1. Decide which emitter attaches it
   (`types-interface.ts` / `operations-interface.ts`).
2. Emit via the `abapDoc` field on the relevant `@abapify/abap-ast`
   factory — never splice raw `"! …` strings.
3. Document the tag in `README.md` (Round-trip markers) and in this
   AGENTS.md.

## Testing gates

Before a PR lands:

```bash
bunx nx run-many -t typecheck,test,build,lint -p abap-ast,openai-codegen
```

Plus the fixture-diff gate:

```bash
cd samples/petstore3-client && bun run generate
git diff --exit-code samples/petstore3-client/generated
```

Any non-empty diff means a non-deterministic change slipped in.

## Deploy recipe (BTP Steampunk)

```bash
bunx adt auth login
bunx openai-codegen \
  --input ./spec/openapi.json \
  --out ./generated/abapgit \
  --format abapgit \
  --base petstore3
bunx adt deploy --source ./generated/abapgit --package ZMY_PACKAGE --activate --unlock
```

Use a **user-owned** Z package (for example `ZMY_PACKAGE`, `ZPEPL`).
`$TMP` on BTP often fails with HTTP 403 because `S_ABPLNGVS` is granted
per package. The authoritative walk-through lives in
[`samples/petstore3-client/e2e/README.md`](../../samples/petstore3-client/e2e/README.md).

## Build commands

```bash
bunx nx build openai-codegen       # tsdown → dist/{index,cli}.mjs
bunx nx test openai-codegen        # vitest
bunx nx typecheck openai-codegen   # tsc --noEmit
bunx nx lint openai-codegen
```
