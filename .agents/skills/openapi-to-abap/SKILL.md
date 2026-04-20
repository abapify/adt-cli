---
name: openapi-to-abap
description: Generate an ABAP REST client class from an OpenAPI document. USE WHEN the user wants to convert OpenAPI / Swagger into ABAP, work on the abap-ast or openai-codegen packages, add a new target profile (on-prem/cloud), add a JSON-Schema to ABAP type mapping, or deploy a generated client to a BTP Steampunk system. Trigger phrases - openapi to abap, generate abap client from openapi, openai-codegen, abap rest client, swagger abap client, petstore abap, abap-ast, typed ABAP AST, ABAP pretty printer, add target profile, add schema mapping.
---

# OpenAPI → ABAP Client Codegen

This skill guides work on the `abap-ast` and `openai-codegen` packages:
generating ABAP REST client classes from OpenAPI 3.0/3.1 documents, adding
new target profiles, extending JSON-Schema → ABAP type mappings, and
deploying the generated output to a live BTP Steampunk system.

## When to use

Invoke this skill when the user asks to:

- Convert an OpenAPI / Swagger document into an ABAP client class.
- Work inside `packages/abap-ast/` or `packages/openai-codegen/`.
- Add a new target profile (for example `s4-cloud`, `s4-onprem`, `ecc`).
- Add or change a JSON-Schema → ABAP type mapping rule.
- Deploy the generated Petstore3 (or any other) client to a BTP Steampunk
  tenant via `adt-cli`.
- Debug parser errors reported by `@abaplint/core` against the generated
  source.

Do **not** use this skill for generic ADT endpoint work (use
`add-endpoint`), object CRUD plumbing (use `add-object-type`), or format
plugins (use `adt-export`).

## Architecture summary

```
OpenAPI JSON/YAML
  → openai-codegen: loadSpec()        (validate + normalize)
  → openai-codegen: planTypes()       (toposort schemas, compute deps)
  → openai-codegen: emitClientClass() (build abap-ast nodes)
  → abap-ast:      print()            (deterministic ABAP source)
  → openai-codegen: writeLayout()     (abapgit on-disk layout)
```

Two packages, one direction of flow:

- `abap-ast` — zero-dependency typed AST + deterministic pretty-printer.
  No IO, no OpenAPI knowledge.
- `openai-codegen` — pipeline + profile registry + CLI
  (`packages/openai-codegen/src/cli.ts`). Depends only on `abap-ast`.

For depth see `website/docs/sdk/packages/openai-codegen.md` and
`packages/openai-codegen/AGENTS.md`. The reference example is
`samples/petstore3-client/` which has an end-to-end README.

## Adding a new target profile

A profile bundles a runtime HTTP/URL/JSON implementation, an ABAP language
version, and any per-target emit tweaks. To add one (e.g. `ecc`):

1. Create `packages/openai-codegen/src/profiles/{id}.ts` exporting a
   `Profile` record (id, label, abapLanguageVersion, runtime key, feature
   flags). Mirror the existing `s4-cloud.ts`.
2. Register it in `packages/openai-codegen/src/profiles/registry.ts` so
   `--target {id}` resolves through `getProfile(id)`.
3. Add runtime templates under
   `packages/openai-codegen/src/runtime/{id}/*.abap.ts` (HTTP client, URL
   encode, JSON (de)serialize). Keep them as plain string exports; they are
   spliced into the final class by the emitter.
4. Add `{id}` to the CLI whitelist in `packages/openai-codegen/src/cli.ts`
   so `--target` validation accepts it.
5. Wire the runtime into the emitter via
   `packages/openai-codegen/src/runtime/index.ts`
   (`getRuntimeFor(profile)`).
6. Add a Vitest suite under `packages/openai-codegen/tests/` that runs the
   pipeline with `--target {id}` against a small fixture and asserts the
   printed source compiles under `@abaplint/core`.

## Adding a new JSON-Schema → ABAP mapping rule

Type mapping lives in `packages/openai-codegen/src/types/map.ts`. To add
a new rule (e.g. `format: "uuid"` → `sysuuid_x16`):

1. Extend the mapping table / switch in `src/types/map.ts`. Keep it pure:
   input `JsonSchema` → output `AbapTypeRef`, no side effects.
2. Add a targeted test case in
   `packages/openai-codegen/tests/types-emit.test.ts` covering the new
   input shape and asserting the emitted AST / printed text.
3. If the new rule introduces a schema **dependency** (named TypeDef
   references another named TypeDef), confirm `planTypes()` in
   `src/plan.ts` still topologically sorts correctly — add a fixture
   whose TypeDef order would break with naive emit order.

## Deploying generated output to a live BTP Steampunk system

Short recipe, assuming the generator has already produced an abapGit
layout under `<dir>`:

1. Authenticate: `bunx adt auth login` (pick the BTP Steampunk profile).
2. Generate:

   ```bash
   bunx openai-codegen \
     --input ./petstore3.openapi.json \
     --out ./out/petstore \
     --target s4-cloud \
     --format abapgit \
     --class-name ZCL_PETSTORE_CLIENT \
     --type-prefix ZPETSTORE
   ```

3. Deploy:

   ```bash
   bunx adt deploy \
     --source ./out/petstore \
     --package ZYOUR_PACKAGE \
     --activate \
     --unlock
   ```

4. On BTP, the `S_ABPLNGVS` authorisation object is granted **per
   package**. Deploying to `$TMP` frequently returns HTTP 403 because the
   calling service user does not own `$TMP`. Always deploy into a
   user-owned `Z*` package.
5. Verify the class landed and activated:

   ```bash
   bunx adt fetch /sap/bc/adt/oo/classes/ZCL_PETSTORE_CLIENT/source/main
   ```

## Common pitfalls

- Never emit `"` line comments in structural positions. The ADT source
  save rejects them as "unknown comments which can't be stored". The
  pipeline already strips them in
  `packages/openai-codegen/src/generate.ts` — preserve that behaviour.
- Never place two top-level `CLASS` blocks in one `.clas.abap` file. The
  emitter writes any `ZCX_*` exception class as its own artifact in the
  abapGit layout.
- Always emit `<ABAP_LANGUAGE_VERSION>5</ABAP_LANGUAGE_VERSION>` in the
  generated `VSEOCLASS` metadata for cloud targets — otherwise the class
  will not activate on Steampunk.
- Runtime HTTP/URL/JSON is spliced in at the `PRIVATE SECTION` /
  `IMPLEMENTATION` boundary in `emitClientClass()`. Do **not** wrap the
  runtime in a synthetic outer method: it produces nested `METHOD`
  blocks and fails parsing.
- Schema TypeDefs must live in `PUBLIC SECTION` so external callers can
  reference them. Do not move them to `PRIVATE SECTION` even if nothing
  inside the class references them.

## Testing

All of the following must be green before a PR lands:

```bash
bunx nx run-many -t typecheck,test,build,lint -p abap-ast,openai-codegen
```

Additionally, running `@abaplint/core` in parse-check mode against the
generated Petstore3 client (see `samples/petstore3-client/README.md`)
must yield **zero fatal parser errors**. Non-fatal style lints are
tolerated.

## Do NOT

- Introduce runtime dependencies on `/ui2/cl_json`, `xco_cp_json`, or
  `cl_http_client` in the `s4-cloud` profile. Cloud runtime is
  self-contained by design.
- Push feature work directly to `main`. Always use a feature branch and
  open a PR.
- Commit internal SAP system IDs, tenant hostnames, or internal company
  names to public files. Keep live-system specifics in local `.env` /
  auth config only.
