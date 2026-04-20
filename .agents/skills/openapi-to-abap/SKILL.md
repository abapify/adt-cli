---
name: openapi-to-abap
description: Generate an ABAP REST client from an OpenAPI document using the v2 pipeline (3 interfaces + 1 class + bundled locals). USE WHEN the user wants to convert OpenAPI / Swagger into ABAP, work on the abap-ast or openai-codegen packages, add a new target profile, add a JSON-Schema to ABAP type mapping, or deploy a generated client to BTP Steampunk. Trigger phrases - openapi to abap, generate abap client from openapi, openai-codegen, abap rest client, swagger abap client, petstore abap, abap-ast, typed ABAP AST, ABAP pretty printer, add target profile, add schema mapping, ZIF_types, ZIF_ops, ZCX_error.
---

# OpenAPI → ABAP Client Codegen (v2)

This skill guides work on the `abap-ast` and `openai-codegen` packages:
generating ABAP REST client classes from OpenAPI 3.0/3.1 documents,
adding new target profiles, extending JSON-Schema → ABAP type mappings,
and deploying the generated output to a live BTP Steampunk system.

## When to use

Invoke this skill when the user asks to:

- Convert an OpenAPI / Swagger document into an ABAP client.
- Work inside `packages/abap-ast/` or `packages/openai-codegen/`.
- Add a new target profile (for example `s4-onprem-modern`,
  `on-prem-classic`).
- Add or change a JSON-Schema → ABAP type mapping rule.
- Deploy a generated client (e.g. Petstore3) to a BTP Steampunk tenant
  via `adt-cli`.
- Debug parser errors reported by `@abaplint/core` against the
  generated source.

Do **not** use this skill for generic ADT endpoint work (use
`add-endpoint`), object CRUD plumbing (use `add-object-type`), or
format plugins (use `adt-export`).

## Architecture summary (v2)

```text
ZIF_<BASE>_TYPES   ── all schemas as ABAP TYPES (+ @openapi-schema markers)
        ▲
        │  zif_<base>_types=>…
        │
ZIF_<BASE>         ── all operations as typed METHODS (+ @openapi-operation markers)
        │                                                RAISING ZCX_<BASE>_ERROR
        │
ZCL_<BASE>         ── implements ZIF_<BASE>
                      one private attribute: client TYPE REF TO lcl_http
                      each method = fetch(...) + CASE response->status( )
                      ─────────────────────────────────────────────
                      local classes (in the same .clas, locals_def/imp):
                        lcl_http, lcl_response, json, lcl_json_parser

ZCX_<BASE>_ERROR   ── inherits cx_static_check
                      carries status / description / body / headers
```

Pipeline (one direction only):

```text
loadSpec (oas/) ─► planTypes (types/) ─► resolveNames (emit/naming.ts)
         ─► emitTypesInterface / emitOperationsInterface / emitExceptionClass
         ─► emitImplementationClass / emitLocalClasses
         ─► print (abap-ast)  ─► writeClientBundle (format/)
```

Two packages:

- `abap-ast` — zero-dependency typed AST + deterministic pretty-printer.
  Emit-only. Declaration nodes carry an optional `abapDoc: readonly
string[]` field; the printer emits `"! <line>` above each declaration.
- `openai-codegen` — pipeline + profile registry + CLI
  (`packages/openai-codegen/src/cli.ts`). Depends only on `abap-ast`.

Reference example: `samples/petstore3-client/` — the generator output
is the 11-file abapGit layout in `samples/petstore3-client/generated/abapgit/`.

## Adding a new target profile

The locals bundle is shared in v2, so adding a profile is now mostly a
registry + dispatcher change:

1. Create `packages/openai-codegen/src/profiles/<id>.ts` exporting a
   `TargetProfile` (id, ABAP language version, allowed kernel classes).
   Mirror `cloud.ts`.
2. Register it in `packages/openai-codegen/src/profiles/registry.ts`
   (`PROFILES`, `ALL_PROFILES`) and add the id to `TargetProfileId` in
   `profiles/types.ts`.
3. Remove the short-circuit in
   `packages/openai-codegen/src/generate.ts` (`assertSupportedTarget`)
   or extend it to accept the new id.
4. If the new profile needs a different kernel class (e.g.
   `cl_http_client` for classic on-prem), branch inside
   `packages/openai-codegen/src/emit/templates/locals-*.abap.ts`. Avoid
   forking the whole bundle — prefer a small conditional.
5. Update the CLI whitelist in `packages/openai-codegen/src/cli.ts`
   (`parseTarget`) if needed.
6. Add a Vitest suite under `packages/openai-codegen/tests/` that runs
   the pipeline with `--target <id>` and parse-checks the output via
   `@abaplint/core`.

## Adding a new JSON-Schema → ABAP mapping rule

Type mapping lives in `packages/openai-codegen/src/types/map.ts`. To
add a rule (e.g. `format: "uuid"` → `sysuuid_x16`):

1. Extend the mapping in `src/types/map.ts`. Keep it pure:
   `JsonSchema → AbapTypeRef | AbapTypeDef`, no side effects.
2. If the new shape introduces a named `TypeDef`, allocate via the
   planner's `NameAllocator` in `src/types/plan.ts`.
3. If cycles are possible, confirm the back-edge handling: the planner
   breaks cycles with `REF TO data` and attaches a `"! @openapi-ref
<field>:<Target>` marker. Add a fixture.
4. Add a test in `packages/openai-codegen/tests/types-emit.test.ts`
   asserting both the AST shape and the printed ABAP.
5. Update the mapping table in `packages/openai-codegen/README.md`.

## Adding a new CLI flag

1. Extend `RawCliOptions` + `buildCliRunOptions` in
   `packages/openai-codegen/src/cli.ts`.
2. Thread through `GenerateOptions` in
   `packages/openai-codegen/src/generate.ts` if it affects emission.
3. Add help text and a unit test in the CLI test suite.

## Deploying to BTP Steampunk

Short recipe:

```bash
bunx adt auth login
bunx openai-codegen \
  --input ./spec/openapi.json \
  --out ./generated/abapgit \
  --format abapgit \
  --base petstore3 \
  --target s4-cloud
bunx adt deploy \
  --source ./generated/abapgit \
  --package ZMY_PACKAGE \
  --activate --unlock
```

Observed layout (11 files):

```text
generated/abapgit/
├── package.devc.xml
└── src/
    ├── zif_petstore3_types.intf.abap / .intf.xml
    ├── zif_petstore3.intf.abap       / .intf.xml
    ├── zcx_petstore3_error.clas.abap / .clas.xml
    ├── zcl_petstore3.clas.abap       / .clas.xml
    ├── zcl_petstore3.clas.locals_def.abap
    └── zcl_petstore3.clas.locals_imp.abap
```

`S_ABPLNGVS` is granted per package on BTP. Deploy into a **user-owned**
Z package (for example `ZMY_PACKAGE` or `ZPEPL`) — `$TMP` often returns
HTTP 403.

Verify the class landed and activated:

```bash
bunx adt fetch /sap/bc/adt/oo/classes/ZCL_PETSTORE3/source/main
```

Authoritative walk-through:
`samples/petstore3-client/e2e/README.md`.

## Common pitfalls

- **Do not re-introduce the monolithic class.** The v1 design (one
  `ZCL_<BASE>` with inline tokenizer, per-op `_des_*` / `_ser_*` stubs,
  private `_send` helper) was rejected. Stay in the v2 3-layer split:
  types interface + operations interface + thin implementation class.
- **Never emit `"` line comments in structural positions.** ADT rejects
  them as unstorable. The writer strips them at emit time. Use ABAPDoc
  (`"!` via the `abapDoc` field) or trailing comments on code lines.
- **ZCX is its own global class file.** Emit `zcx_<base>_error.clas.abap`
  - envelope as a separate artifact. Do not concatenate it into the
    main class file.
- **`VSEOINTERF` / `VSEOCLASS` must carry
  `<ABAP_LANGUAGE_VERSION>5</ABAP_LANGUAGE_VERSION>`** for cloud
  systems. Without it, Steampunk import fails with a language-version
  mismatch.
- **Use `--package` with a user-owned Z package on BTP.** `$TMP`
  typically fails with `S_ABPLNGVS` 403.
- **`lcl_http->fetch` is transport-only.** Do NOT add JSON awareness,
  status-code dispatch, or operation knowledge to it. Those belong in
  the per-operation method body in `ZCL_<BASE>`.
- **Schema TYPES live on `ZIF_<BASE>_TYPES`, never on the class.** ABAP's
  unified component namespace on a class collides types with attributes
  and methods. Keep the types interface as their only home; reference
  them as `zif_<base>_types=>…`.
- **No hungarian prefixes (`iv_`, `rv_`, `ls_`) in generated names.**
  Names come from `operationId` / schema property names, sanitized for
  ABAP. Do not re-introduce legacy prefixes.

## Testing

All of the following must be green before a PR lands:

```bash
bunx nx run-many -t typecheck,test,build,lint -p abap-ast,openai-codegen
```

Regression gate — regenerate the Petstore3 fixture and confirm the diff
is empty:

```bash
cd samples/petstore3-client && bun run generate
git diff --exit-code samples/petstore3-client/generated
```

Parse-check — the emitted source must parse under `@abaplint/core` with
zero fatal errors. Non-fatal style lints are tolerated.

## Do NOT

- Emit a monolithic `ZCL_<BASE>` with inline JSON tokenizer or per-op
  `_des_*` / `_ser_*` private stubs. That was v1; v2 forbids it.
- Introduce Z-dependencies in the bundled locals (`/ui2/cl_json` and
  other standard kernel classes are fine; any `Z*` reference is not).
- Add private helper methods to the generated `ZCL_<BASE>` beyond
  `constructor`.
- Commit internal SAP system IDs, tenant hostnames, or company names
  to public files. Keep live-system specifics in local `.env` / auth
  config only.
- Push feature work directly to `main`. Always use a feature branch.
