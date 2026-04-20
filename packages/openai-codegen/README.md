# @abapify/openai-codegen

**Deterministic OpenAPI → ABAP client code generator.** Reads an OpenAPI
3.x spec and emits three global ABAP interfaces, one global exception
class, and one thin implementation class bundled with a small set of
local helper classes. The result targets SAP BTP / Steampunk
(`s4-cloud`) out of the box and has **zero Z-dependencies** — the
bundled locals wrap kernel APIs (`cl_web_http_client_manager`,
`cl_http_destination_provider`, `/ui2/cl_json`, `cl_abap_conv_codepage`,
…) only.

Re-running the generator with the same inputs produces byte-identical
output. Generated artifacts are safe to commit and diff.

## Install

```bash
bun add -D @abapify/openai-codegen
bunx openai-codegen --help
```

## Quick start

```bash
bunx openai-codegen \
  --input ./petstore3.json \
  --out ./out/abapgit \
  --base petstore3 \
  --format abapgit \
  --target s4-cloud \
  --description "Petstore v3 client"
```

With the default `abapgit` layout this writes **11 files**:

```text
out/abapgit/
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
        │
ZIF_<BASE>         ── all operations as typed METHODS (+ @openapi-operation markers)
        │                                             ── RAISING ZCX_<BASE>_ERROR
        │
ZCL_<BASE>         ── implements ZIF_<BASE>
                      one private attribute: client TYPE REF TO lcl_http
                      each method body = fetch(...) + CASE response->status( )
                      ─────────────────────────────────────────────
                      local classes (same .clas file, locals_def/imp):
                        lcl_http          (HTTP transport)
                        lcl_response      (status / body / headers)
                        json              (stringify / render / parse)
                        lcl_json_parser   (internal JSON parser)

ZCX_<BASE>_ERROR   ── inherits cx_static_check
                      carries status / description / body / headers
```

The implementation class is deliberately minimal:

- exactly one private attribute (`client`),
- no private helper methods besides `constructor`,
- each operation method is **one `fetch` call** followed by a `CASE`
  block that decodes the success branch via `json=>parse( ... )->to( … )`
  and raises `ZCX_<BASE>_ERROR` for every other status.

Schema `TYPES` intentionally live on their own **interface** — not on
the class. ABAP's unified component namespace for types / attributes /
methods on a class would otherwise force awkward name mangling; putting
types on `ZIF_<BASE>_TYPES` keeps the main class and the operations
interface collision-free.

## Generated API surface

### Layer 1 — types interface (`zif_petstore3_types.intf.abap`)

```abap
"! Generated types for ZCL_PETSTORE3.
INTERFACE ZIF_PETSTORE3_TYPES PUBLIC.
  "! @openapi-schema Category
  TYPES: BEGIN OF category,
    id   TYPE int8,
    name TYPE string,
  END OF category.
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

### Layer 2 — operations interface (`zif_petstore3.intf.abap`)

```abap
INTERFACE zif_petstore3 PUBLIC.
  "! @openapi-operation addPet
  "! @openapi-path POST /pet
  "! Add a new pet to the store.
  METHODS add_pet
    IMPORTING body TYPE zif_petstore3_types=>pet
    RETURNING VALUE(pet) TYPE zif_petstore3_types=>pet
    RAISING zcx_petstore3_error.
  "! @openapi-operation getPetById
  "! @openapi-path GET /pet/{petId}
  "! Find pet by ID.
  METHODS get_pet_by_id
    IMPORTING pet_id TYPE int8
    RETURNING VALUE(pet) TYPE zif_petstore3_types=>pet
    RAISING zcx_petstore3_error.
ENDINTERFACE.
```

### Layer 3 — implementation class (`zcl_petstore3.clas.abap`)

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
      WHEN 400.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 400
          description = 'Invalid input'
          body        = response->body( ) ).
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
  ENDMETHOD.
ENDCLASS.
```

### Bundled locals (`zcl_petstore3.clas.locals_def.abap` / `locals_imp.abap`)

The local classes expose a small, stable API that is **transport-only**
for HTTP and **typed-by-reference** for JSON:

```abap
" Transport (HTTP): lcl_http / lcl_response
DATA(response) = client->fetch(
  method  = 'GET'
  path    = '/pet/123'
  query   = VALUE #( ( name = 'detail' value = 'full' ) )
  headers = VALUE #( ( name = 'Accept' value = 'application/json' ) ) ).
response->status( ).     " -> i
response->body( ).       " -> xstring
response->text( ).       " -> string (decoded)
response->header( 'etag' ).
response->headers( ).

" JSON: json helper (mirrors abapify/json)
DATA(payload) = json=>stringify( pet ).       " string
DATA(raw)     = json=>render( pet ).          " xstring
json=>parse( response->body( ) )->to( REF #( pet ) ).
```

`lcl_http->fetch` is deliberately ignorant of JSON, status codes, and
operation identities. All policy lives in the per-operation method body
in `ZCL_<BASE>`. The JSON API surface mirrors
[`abapify/json`](https://github.com/abapify) and wraps `/ui2/cl_json` +
`cl_abap_conv_codepage`.

## Configuration

All four global names and all four local names are configurable. The
simplest path is to provide `--base`; every name then derives from it.
Any individual override wins.

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

Other flags:

| Flag                      | Purpose                                                          |
| ------------------------- | ---------------------------------------------------------------- |
| `-i, --input <path>`      | Path / URL / file for the OpenAPI spec (JSON or YAML). Required. |
| `-o, --out <dir>`         | Output directory. Required.                                      |
| `-f, --format <list>`     | `abapgit` (default), `gcts`, or `abapgit,gcts`.                  |
| `-t, --target <profile>`  | Target profile (`s4-cloud` only, default).                       |
| `-d, --description <txt>` | Description stored in the generated `.clas.xml` / `.intf.xml`.   |

## Library usage

```ts
import { generate } from '@abapify/openai-codegen';

const result = await generate({
  input: './petstore3.json',
  outDir: './out/abapgit',
  format: 'abapgit',
  target: 's4-cloud',
  names: { base: 'petstore3' },
  description: 'Petstore v3 client',
});

console.log(result.files); // sorted, deduped relative paths
console.log(result.typeCount, result.operationCount);
console.log(result.resolvedNames);
```

## Pipeline

```text
OpenAPI spec
  → loadSpec           ($ref-deref via @apidevtools/swagger-parser)
  → planTypes          (topological sort of schemas + cycle detection)
  → resolveNames       (NamesConfig → ResolvedNames; validates ABAP idents)
  → emitTypesInterface      (Layer 1 — ZIF_<BASE>_TYPES AST)
  → emitOperationsInterface (Layer 2 — ZIF_<BASE> AST)
  → emitExceptionClass      (ZCX_<BASE>_ERROR AST)
  → emitImplementationClass (Layer 3 — ZCL_<BASE> AST)
  → emitLocalClasses        (locals_def + locals_imp templates)
  → print               (four AST → ABAP source, via @abapify/abap-ast)
  → writeClientBundle   (abapgit or gcts on-disk tree + envelopes)
```

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

## Round-trip markers

Every generated ABAP declaration carries an ABAPDoc block that a
downstream tool (for example a future `.aclass` parser) can use to
rebuild the originating OpenAPI shape:

| Marker                                | Attached to         | Meaning                                              |
| ------------------------------------- | ------------------- | ---------------------------------------------------- |
| `"! @openapi-schema <Name>`           | `TYPES` declaration | Original JSON-Schema component name.                 |
| `"! @openapi-operation <operationId>` | `METHODS`           | Original OpenAPI `operationId`.                      |
| `"! @openapi-path <VERB> <path>`      | `METHODS`           | HTTP verb + templated path.                          |
| `"! @openapi-ref <field>:<Target>`    | `TYPES` field       | Field broken to `REF TO data` references `<Target>`. |

Markers are plain lines under the printer's ABAPDoc rules; they are
never rewritten or wrapped.

## Deploying to BTP Steampunk

Short recipe (see
[`samples/petstore3-client/e2e/README.md`](../../samples/petstore3-client/e2e/README.md)
for the authoritative walk-through):

```bash
bunx adt auth login
bunx openai-codegen \
  --input ./spec/openapi.json \
  --out ./generated/abapgit \
  --format abapgit \
  --base petstore3
bunx adt deploy --source ./generated/abapgit --package ZMY_PACKAGE --activate --unlock
```

`S_ABPLNGVS` is granted per package on BTP. Deploy into a user-owned
`Z*` package (for example `ZMY_PACKAGE` or `ZPEPL`); targeting `$TMP`
often returns HTTP 403 on BTP.

## Not yet supported

- OpenAPI webhooks and callbacks.
- Server-Sent Events / streaming responses.
- Full OAuth2 `authorization_code` / `client_credentials` flows
  (`apiKey`, `http bearer`, `http basic` are emitted; `oauth2` exposes
  an overridable hook only).
- `.aclass` DSL parser — tracked in `@abapify/abap-ast`.
- Per-target runtime bundles beyond `s4-cloud` (profile slots exist for
  `s4-onprem-modern` and `on-prem-classic`; only `s4-cloud` emits in v1).

## License

MIT
