---
title: '@abapify/openai-codegen'
description: Deterministic OpenAPI → ABAP client code generator for SAP BTP Steampunk. Emits 3 interfaces + 1 class + bundled helper locals with zero Z-dependencies.
---

# @abapify/openai-codegen

Deterministic OpenAPI → ABAP client code generator. Reads an OpenAPI
3.x spec and emits three global ABAP interfaces, one global exception
class, and one thin implementation class bundled with a small set of
local helper classes. The result targets SAP BTP / Steampunk
(`s4-cloud`) and has **zero Z-dependencies** — the bundled locals wrap
kernel APIs (`cl_web_http_client_manager`, `cl_http_destination_provider`,
`/ui2/cl_json`, `cl_abap_conv_codepage`) only.

Re-running the generator with the same inputs produces byte-identical
output; generated artifacts are safe to commit and diff.

## Install

```bash
bun add -D @abapify/openai-codegen
bunx openai-codegen --help
```

## Quick start

```bash
bunx openai-codegen \
  --input ./spec/openapi.json \
  --out ./generated/abapgit \
  --base petstore3 \
  --format abapgit \
  --target s4-cloud \
  --description "Petstore v3 client"
```

With the default `abapgit` layout this writes **11 files**:

```text
generated/abapgit/
├── package.devc.xml
└── src/
    ├── zif_petstore3_types.intf.abap         # Layer 1 — TYPES interface
    ├── zif_petstore3_types.intf.xml
    ├── zif_petstore3.intf.abap               # Layer 2 — operations interface
    ├── zif_petstore3.intf.xml
    ├── zcx_petstore3_error.clas.abap         # global exception class
    ├── zcx_petstore3_error.clas.xml
    ├── zcl_petstore3.clas.abap               # Layer 3 — thin implementation
    ├── zcl_petstore3.clas.xml
    ├── zcl_petstore3.clas.locals_def.abap    # bundled helper locals
    └── zcl_petstore3.clas.locals_imp.abap
```

## Architecture

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
                      local classes (same .clas file, locals_def/imp):
                        lcl_http          (HTTP transport)
                        lcl_response      (status / body / headers)
                        json              (stringify / render / parse)
                        lcl_json_parser   (internal JSON parser)

ZCX_<BASE>_ERROR   ── inherits cx_static_check
                      carries status / description / body / headers
```

The implementation class is intentionally minimal: exactly one private
attribute (`client`), no private helper methods besides `constructor`,
and each operation method is **one `fetch` call** followed by a `CASE`
block that decodes the success branch via `json=>parse( … )->to( … )`
and raises `ZCX_<BASE>_ERROR` for every other status.

Schema `TYPES` intentionally live on their own **interface** — not on
the class. ABAP's unified component namespace for types / attributes /
methods on a class would otherwise force awkward name mangling; putting
types on `ZIF_<BASE>_TYPES` keeps both the implementation class and
the operations interface collision-free.

## Generated API surface

### Types interface

```abap
"! Generated types for ZCL_PETSTORE3.
INTERFACE ZIF_PETSTORE3_TYPES PUBLIC.
  "! @openapi-schema Pet
  TYPES: BEGIN OF pet,
    id         TYPE int8,
    name       TYPE string,
    category   TYPE category,
    photo_urls TYPE STANDARD TABLE OF string WITH EMPTY KEY,
    tags       TYPE STANDARD TABLE OF tag WITH EMPTY KEY,
    status     TYPE string,
  END OF pet.
ENDINTERFACE.
```

### Operations interface

```abap
INTERFACE zif_petstore3 PUBLIC.
  "! @openapi-operation getPetById
  "! @openapi-path GET /pet/{petId}
  "! Find pet by ID.
  METHODS get_pet_by_id
    IMPORTING pet_id TYPE int8
    RETURNING VALUE(pet) TYPE zif_petstore3_types=>pet
    RAISING zcx_petstore3_error.
ENDINTERFACE.
```

### Implementation class

```abap
CLASS ZCL_PETSTORE3 DEFINITION PUBLIC CREATE PUBLIC.
  INTERFACES zif_petstore3.
  PUBLIC SECTION.
    METHODS constructor
      IMPORTING
        destination TYPE string
        server TYPE string DEFAULT '/api/v3'.
  PRIVATE SECTION.
    DATA client TYPE REF TO lcl_http.
ENDCLASS.

CLASS ZCL_PETSTORE3 IMPLEMENTATION.
  METHOD constructor.
    client = NEW lcl_http( destination = destination server = server ).
  ENDMETHOD.

  METHOD zif_petstore3~add_pet.
    DATA(response) = client->fetch(
      method  = 'POST'
      path    = '/pet'
      body    = json=>stringify( body )
      headers = VALUE #( ( name = 'Content-Type' value = 'application/json' ) ) ).
    CASE response->status( ).
      WHEN 200.
        json=>parse( response->body( ) )->to( REF #( pet ) ).
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
  ENDMETHOD.
ENDCLASS.
```

### Bundled locals

```abap
" Transport — lcl_http + lcl_response
DATA(response) = client->fetch(
  method  = 'GET'
  path    = '/pet/123'
  headers = VALUE #( ( name = 'Accept' value = 'application/json' ) ) ).
response->status( ). response->body( ). response->text( ).
response->header( 'etag' ). response->headers( ).

" JSON — json helper (mirrors abapify/json)
DATA(payload) = json=>stringify( pet ).
json=>parse( response->body( ) )->to( REF #( pet ) ).
```

`lcl_http->fetch` is **transport-only** — no JSON, no status-code
dispatch, no operation awareness. All mapping lives in the per-operation
method in `ZCL_<BASE>`. The `json` helper API matches `abapify/json` and
internally wraps `/ui2/cl_json` plus `cl_abap_conv_codepage`.

## Configuration

| CLI flag                        | Library field (`NamesConfig`) | Default                                 |
| ------------------------------- | ----------------------------- | --------------------------------------- |
| `--base <name>`                 | `base`                        | _required unless all 4 overrides given_ |
| `--types-interface <name>`      | `typesInterface`              | `ZIF_<BASE>_TYPES`                      |
| `--operations-interface <name>` | `operationsInterface`         | `ZIF_<BASE>`                            |
| `--class-name <name>`           | `implementationClass`         | `ZCL_<BASE>`                            |
| `--exception-class <name>`      | `exceptionClass`              | `ZCX_<BASE>_ERROR`                      |
| _(library only)_                | `localHttpClass`              | `lcl_http`                              |
| _(library only)_                | `localResponseClass`          | `lcl_response`                          |
| _(library only)_                | `localJsonClass`              | `json`                                  |
| _(library only)_                | `localJsonParserClass`        | `lcl_json_parser`                       |

Other flags: `--input`, `--out`, `--format` (`abapgit` / `gcts` /
`abapgit,gcts`), `--target` (`s4-cloud` only in v1), `--description`.

## Library usage

```ts
import { generate } from '@abapify/openai-codegen';

const result = await generate({
  input: './spec/openapi.json',
  outDir: './generated/abapgit',
  format: 'abapgit',
  target: 's4-cloud',
  names: { base: 'petstore3' },
  description: 'Petstore v3 client',
});

console.log(result.files); // sorted, deduped relative paths
console.log(result.typeCount); // entries in the types interface
console.log(result.operationCount); // methods in the operations interface
console.log(result.resolvedNames); // the final ABAP global + local names
```

## Pipeline

```text
OpenAPI spec
  → loadSpec                ($ref-deref via @apidevtools/swagger-parser)
  → planTypes               (topological sort + cycle breaking)
  → resolveNames            (NamesConfig → ResolvedNames; validates idents)
  → emitTypesInterface      (Layer 1 — ZIF_<BASE>_TYPES AST)
  → emitOperationsInterface (Layer 2 — ZIF_<BASE> AST)
  → emitExceptionClass      (ZCX_<BASE>_ERROR AST)
  → emitImplementationClass (Layer 3 — ZCL_<BASE> AST)
  → emitLocalClasses        (locals_def + locals_imp from templates)
  → print                   (4 × deterministic print, via @abapify/abap-ast)
  → writeClientBundle       (abapgit or gcts on-disk tree + envelopes)
```

## OpenAPI → ABAP type mapping

| JSON Schema                               | ABAP                                                    |
| ----------------------------------------- | ------------------------------------------------------- |
| `boolean`                                 | `abap_bool`                                             |
| `integer` / `integer format:int64`        | `i` / `int8`                                            |
| `number` (default / `float` / `double`)   | `decfloat34` / `f`                                      |
| `string` (default)                        | `string`                                                |
| `string, format: date`                    | `d`                                                     |
| `string, format: date-time`               | `timestampl`                                            |
| `string, format: uuid`                    | `sysuuid_x16`                                           |
| `string, format: byte` / `binary`         | `xstring`                                               |
| `array of X`                              | `STANDARD TABLE OF <X> WITH EMPTY KEY`                  |
| `object` (properties)                     | `BEGIN OF <name> … END OF <name>.`                      |
| `object` with `additionalProperties` only | `_map` table of `{ key, value }` entries                |
| `allOf`                                   | Flattened into one structure                            |
| `oneOf` / `anyOf`                         | Union merge — fields from every branch                  |
| `$ref` (forward)                          | `NamedTypeRef`                                          |
| `$ref` (back-edge, cyclic)                | `REF TO data` + `"! @openapi-ref <field>:<Target>`      |
| `nullable: true`                          | Same ABAP type (nullability preserved at (de)serialise) |

## Round-trip markers

| Marker                                | Attached to         | Meaning                                              |
| ------------------------------------- | ------------------- | ---------------------------------------------------- |
| `"! @openapi-schema <Name>`           | `TYPES` declaration | Original JSON-Schema component name.                 |
| `"! @openapi-operation <operationId>` | `METHODS`           | Original OpenAPI `operationId`.                      |
| `"! @openapi-path <VERB> <path>`      | `METHODS`           | HTTP verb + templated path.                          |
| `"! @openapi-ref <field>:<Target>`    | `TYPES` field       | Field broken to `REF TO data` references `<Target>`. |

Markers follow the printer's ABAPDoc rules from
[`@abapify/abap-ast`](./abap-ast): plain `"! <line>` above the
declaration, never rewritten or wrapped.

## Deploying to BTP Steampunk

```bash
bunx adt auth login
bunx openai-codegen \
  --input ./spec/openapi.json \
  --out ./generated/abapgit \
  --format abapgit \
  --base petstore3
bunx adt deploy \
  --source ./generated/abapgit \
  --package ZMY_PACKAGE \
  --activate --unlock
```

`S_ABPLNGVS` is granted per package on BTP. Use a user-owned `Z*`
package (for example `ZMY_PACKAGE` or `ZPEPL`) — `$TMP` often fails
with HTTP 403. See
[`samples/petstore3-client/e2e/README.md`](https://github.com/abapify/adt-cli/blob/main/samples/petstore3-client/e2e/README.md)
for the full walk-through.

## Not yet supported (v1)

- OpenAPI webhooks and callbacks.
- Server-Sent Events / streaming responses.
- Full OAuth2 `authorization_code` / `client_credentials` flows
  (`apiKey`, `http bearer`, `http basic` are emitted; `oauth2` exposes
  an overridable hook only).
- `.aclass` DSL parser — tracked in [`@abapify/abap-ast`](./abap-ast).
- Per-target runtime bundles beyond `s4-cloud` — profile slots exist
  for `s4-onprem-modern` and `on-prem-classic`, but only `s4-cloud`
  emits in v1.

## Type mapping

| JSON Schema                               | ABAP                                                        |
| ----------------------------------------- | ----------------------------------------------------------- |
| `boolean`                                 | `abap_bool`                                                 |
| `integer` / `integer, format: int64`      | `i` / `int8`                                                |
| `number` (default / `float` / `double`)   | `decfloat34` / `f`                                          |
| `string` (default)                        | `string`                                                    |
| `string, format: date`                    | `d`                                                         |
| `string, format: date-time`               | `timestampl`                                                |
| `string, format: uuid`                    | `sysuuid_x16`                                               |
| `string, format: byte` / `binary`         | `xstring`                                                   |
| `array of X`                              | `STANDARD TABLE OF <X> WITH EMPTY KEY`                      |
| `object` (properties)                     | `BEGIN OF <name> … END OF <name>.`                          |
| `object` with `additionalProperties` only | `_map` table of `BEGIN OF entry, key, value, END OF entry`  |
| `enum`                                    | Field typed as base scalar; values documented via ABAPDoc.  |
| `allOf`                                   | Flattened into one structure.                               |
| `oneOf` / `anyOf`                         | Union merge — fields from every branch, optional semantics. |
| `$ref` (forward)                          | `NamedTypeRef` into the existing plan entry.                |
| `$ref` (back-edge — cyclic)               | `REF TO data` with `"! @openapi-ref <field>:<Target>`.      |
| `nullable: true`                          | Same ABAP type (nullability preserved at (de)serialise).    |

Types are emitted in semantic topological order. Back-edges introduced
by cyclic schemas are broken with a `REF TO data` plus a structured
`@openapi-ref` marker, so a future reader can reconstruct the original
reference target.

## Not yet supported

- OpenAPI webhooks and callbacks.
- Server-Sent Events / streaming responses.
- Full OAuth2 `authorization_code` / `client_credentials` flows
  (`apiKey`, `http bearer`, `http basic` are emitted; `oauth2` exposes
  an overridable hook only).
- `.aclass` DSL parser — tracked in `@abapify/abap-ast`.
- Per-target runtime bundles beyond `s4-cloud` (profile slots exist for
  `s4-onprem-modern` and `on-prem-classic`; only `s4-cloud` emits in v1).

## See also

- [`abap-ast`](./abap-ast) — the AST and printer every emitter is built on.
- [`adt-cli`](./adt-cli) — deploy and activate the generated artifacts.
- [`adt-plugin-abapgit`](./adt-plugin-abapgit),
  [`adt-plugin-gcts`](./adt-plugin-gcts) — the on-disk formats this
  generator writes to.
