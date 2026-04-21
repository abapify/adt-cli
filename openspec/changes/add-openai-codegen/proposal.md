# Add OpenAPI → ABAP client codegen (`@abapify/openai-codegen`) — v2

## Why

Consuming OpenAPI-described REST/JSON APIs from ABAP today requires hand-written, boilerplate-heavy clients. We want a **deterministic TypeScript-based generator** that reads an OpenAPI spec and emits a small, typed, abaplint-clean ABAP client that can be shipped into cloud-first SAP systems (BTP / Steampunk) through the existing `adt-cli` deploy flow — and tested against a live ABAP system.

A v1 attempt landed a single monolithic `ZCL_<name>` class with inline JSON, inline HTTP, and inline types. It worked but it was unreadable, untestable in isolation, and impossible to mock. It was rejected during review.

v2 takes the opposite approach — the same approach `ts.factory` / `typebox` take for TS: **typed AST + pretty-printer**, plus a **3-layer contract** that separates data types, operation contract, implementation, and transport helpers. Every layer is independently testable, mockable, and regenerable.

## What Changes

New packages:

- **`@abapify/abap-ast`** — zero-dependency typed AST nodes and pretty-printer for ABAP classes, interfaces, types, statements, and expressions. Foundation for deterministic code generation. No parser; emission only. Now supports **ABAPDoc** comments (`"! …`) attached to declaration nodes.
- **`@abapify/openai-codegen`** — OpenAPI → ABAP client generator. Uses `@apidevtools/swagger-parser` for `$ref` dereferencing + validation, then drives a typed planner → emitter pipeline that produces a **3-layer client bundle** per spec. Target profile is `s4-cloud` (Steampunk) only; output format is abapGit.

New sample:

- **`samples/petstore3-client`** — end-to-end proof project. Vendored Petstore v3 OpenAPI spec, a `bun run generate` script, committed generated ABAP under `generated/abapgit/`, a hand-written AUnit test class, and an `e2e/README.md` capturing the live-deploy verification workflow.

### v2 output contract

For every OpenAPI spec the generator emits exactly **11 abapGit files** under one client bundle:

| File                                  | Role                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| `zif_<base>_types.intf.abap` + `.xml` | **Layer 1** — all schemas as pure `TYPES` declarations                             |
| `zif_<base>.intf.abap` + `.xml`       | **Layer 2** — one `METHODS` declaration per operation, typed via Layer 1           |
| `zcx_<base>_error.clas.abap` + `.xml` | **Exception** — `ZCX_<base>_ERROR` carrying `status`, `body`, `operation_id`       |
| `zcl_<base>.clas.abap` + `.xml`       | **Layer 3** — minimal implementation class (one `fetch` attribute + one method/op) |
| `zcl_<base>.clas.locals_def.abap`     | Local class definitions (`lcl_http`, `lcl_response`, `lcl_json_parser`, `json`)    |
| `zcl_<base>.clas.locals_imp.abap`     | Local class implementations                                                        |
| `package.devc.xml`                    | abapGit package manifest                                                           |

Design properties of the bundle:

- **Zero Z-dependencies.** The output only references kernel classes (`cl_web_http_client_manager`, `cl_http_destination_provider`, `cl_http_utility`, `/ui2/cl_json`, `cl_abap_conv_codepage`). No Z-prefixed class appears outside the generated bundle itself.
- **Minimal implementation class.** `ZCL_<base>` has exactly one private attribute (`client TYPE REF TO lcl_http`), a constructor that wires it, and one method per operation. Each method body is a `client->fetch( … )` call followed by a `CASE response->status( ) … ENDCASE` that dispatches to Layer-1 types or raises `ZCX_<base>_ERROR`.
- **Bundled local helpers.** `zcl_<base>.clas.locals_imp.abap` ships four local classes so the client is self-contained:
  - `json` — mirrors the `abapify/json` API: `json=>stringify( data ) → string`, `json=>render( data ) → xstring`, `json=>parse( any )->to( REF #( target ) )`. Wraps `/ui2/cl_json`.
  - `lcl_http` — a fetch-style transport facade over `cl_web_http_client_manager`. Signature mirrors `abapify/fetch`: `IMPORTING method path query? headers? body? binary?` returning a `lcl_response`.
  - `lcl_response` — status/body/text/header/headers accessors.
  - `lcl_json_parser` — thin wrapper that decouples parse sites from `/ui2/cl_json` call shape.
- **Transport is opinion-free.** `lcl_http->fetch` has no reference to any OpenAPI type, status code, or per-operation JSON shape. All status dispatch and JSON ser/de happens in Layer-3 methods of `ZCL_<base>`.
- **Configurable names.** Every global class/interface name (`ZIF_<base>_TYPES`, `ZIF_<base>`, `ZCX_<base>_ERROR`, `ZCL_<base>`) and every local class name (`lcl_http`, `lcl_response`, `lcl_json_parser`, `json`) is overridable via a `NamesConfig` object or CLI flags.
- **Round-trip ABAPDoc markers.** Every emitted TYPES/METHODS declaration carries an ABAPDoc comment tying it back to the OpenAPI spec:
  - `"! @openapi-schema <OriginalName>` on every Layer-1 `TYPES` entry.
  - `"! @openapi-operation <originalOperationId>` on every Layer-2 `METHODS` entry.
  - `"! @openapi-path <VERB> /path` as a secondary marker on operations.
  - `"! @openapi-ref #/components/schemas/<Name>` on fields whose ABAP type was derived from a `$ref`.

Target profile scope for v2:

- `s4-cloud` only. Other profile stubs from v1 (`on-prem-classic`, `s4-onprem-modern`) remain unimplemented and are tracked as follow-ups.
- Only abapGit output format is emitted. gCTS remains designed-for but unimplemented.

## Affected packages

- **new** `packages/abap-ast/` — AST + printer, plus ABAPDoc support on declaration nodes.
- **new** `packages/openai-codegen/` — generator + CLI, 3-layer emitter pipeline (`src/emit/*`), `format/writeClientBundle`, `generate.ts`.
- **new** `samples/petstore3-client/` — regenerated under v2 with the 11-file bundle and a hand-written AUnit test class.
- **touched** root `AGENTS.md` — add new packages to the dependency graph section.

## Architectural impact

```
@abapify/abap-ast               (zero deps)
@abapify/openai-codegen ─► @abapify/abap-ast
samples/petstore3-client ─► @abapify/openai-codegen (build-time only)
```

Both new packages are graph leaves. There is no cycle risk and no impact on the contract-first architecture of `adt-client` / `adt-schemas` / `adt-cli`.

The Steampunk cloud whitelist drives the transport choice: `cl_web_http_client_manager` + `cl_http_destination_provider` in `lcl_http`, and `/ui2/cl_json` for JSON. `@apidevtools/swagger-parser` stays a TypeScript-only dev dependency — it never reaches ABAP output.

## Testing

- **Unit** — `@abapify/abap-ast` ships 115 printer/factory tests (incl. ABAPDoc scenarios). `@abapify/openai-codegen` ships ~140 tests across naming, Layer-1/2/3 emitters, exception class, locals templating, response mapper, and format writer.
- **Abaplint** — the generated output parses under `@abaplint/core` with zero fatal `parser_error` issues. A test in `openai-codegen` runs abaplint on the petstore fixture.
- **Determinism** — regenerating `samples/petstore3-client/generated/abapgit` with identical inputs produces byte-identical files; enforced by `git diff --exit-code` in CI.
- **Live BTP Steampunk** — verified by `adt-cli deploy samples/petstore3-client/generated/abapgit --package <user-owned Z pkg>` against a user-owned BTP tenant, followed by `adt aunit` against the hand-written test class. The workflow is captured in `samples/petstore3-client/e2e/README.md`.

## Rollback

Pure additive change. Deleting the three new directories (`packages/abap-ast/`, `packages/openai-codegen/`, `samples/petstore3-client/`) restores pre-feature behaviour. Nothing outside those paths depends on the new packages.
