# Delta — `openai-codegen` capability (v2)

## ADDED Requirements

### Requirement: Three-layer output contract

For every OpenAPI specification the `@abapify/openai-codegen` CLI SHALL emit an abapGit bundle consisting of exactly four global objects — `ZIF_<base>_TYPES` (Layer 1: data types), `ZIF_<base>` (Layer 2: operations), `ZCX_<base>_ERROR` (exception), `ZCL_<base>` (Layer 3: implementation) — together with bundled local helpers (`zcl_<base>.clas.locals_def.abap` + `zcl_<base>.clas.locals_imp.abap`) and a `package.devc.xml` manifest, for a total of 11 files.

#### Scenario: Petstore v3 bundle layout

- **GIVEN** the vendored `samples/petstore3-client/spec/openapi.json`
- **WHEN** `openai-codegen --input ./spec/openapi.json --out ./generated/abapgit --base petstore3` is executed
- **THEN** `./generated/abapgit/src/` contains `zif_petstore3_types.intf.abap`+`.xml`, `zif_petstore3.intf.abap`+`.xml`, `zcx_petstore3_error.clas.abap`+`.xml`, `zcl_petstore3.clas.abap`+`.xml`, `zcl_petstore3.clas.locals_def.abap`, `zcl_petstore3.clas.locals_imp.abap`, and `./generated/abapgit/package.devc.xml`.

#### Scenario: Layer 1 contains only TYPES

- **WHEN** the generator emits `ZIF_<base>_TYPES`
- **THEN** the interface body contains only `TYPES:` declarations (one per OpenAPI schema, topologically ordered), and no `METHODS`, `DATA`, or `CONSTANTS`.

### Requirement: Minimal implementation class

The generated `ZCL_<base>` SHALL have exactly one private attribute (`client TYPE REF TO lcl_http`), a constructor that assigns it, and one public method per OpenAPI operation. Each method body SHALL consist of a single `client->fetch( ... )` call followed by a `CASE response->status( ) ... ENDCASE` that either returns a Layer-1 typed value or raises `ZCX_<base>_ERROR`.

#### Scenario: findPetsByStatus body shape

- **GIVEN** the operation `findPetsByStatus`
- **WHEN** the generator emits `ZCL_<base>`
- **THEN** the method body is a `DATA(response) = me->client->fetch( ... ).` statement followed by `CASE response->status( ). WHEN 200. ... WHEN OTHERS. RAISE EXCEPTION TYPE zcx_<base>_error ... ENDCASE.`, with no other executable statements.

#### Scenario: No extra private state

- **WHEN** `ZCL_<base>` is generated
- **THEN** its `PRIVATE SECTION` contains exactly one `DATA client TYPE REF TO lcl_http` attribute and no other `DATA`, `CLASS-DATA`, or `CONSTANTS`.

### Requirement: Zero Z-dependencies in generated bundle

The generated ABAP bundle SHALL only reference SAP kernel classes (`cl_web_http_client_manager`, `cl_http_destination_provider`, `cl_http_utility`, `/ui2/cl_json`, `cl_abap_conv_codepage`). No Z-prefixed class outside the bundle itself SHALL appear in the output.

#### Scenario: Grep regression

- **GIVEN** the generated bundle for any OpenAPI spec
- **WHEN** the source files are scanned for `\bz[a-z_]+` identifiers
- **THEN** every match is one of `ZIF_<base>_TYPES`, `ZIF_<base>`, `ZCX_<base>_ERROR`, `ZCL_<base>`, or their configured aliases.

### Requirement: Configurable class and interface names

Every global class and interface name (`ZIF_<base>_TYPES`, `ZIF_<base>`, `ZCX_<base>_ERROR`, `ZCL_<base>`) and every local class name (`json`, `lcl_http`, `lcl_response`, `lcl_json_parser`) SHALL be overridable via a `NamesConfig` object or matching CLI flags.

#### Scenario: Override via CLI

- **GIVEN** `--implementation-class ZCL_MY_PETS --types-interface ZIF_MY_PETS_T`
- **WHEN** the generator runs
- **THEN** the output files are named `zcl_my_pets.clas.*` and `zif_my_pets_t.intf.*`, and every cross-reference inside the bundle uses the overridden names.

#### Scenario: Collision detection

- **GIVEN** a config that sets `implementation-class` and `operations-interface` to the same value
- **WHEN** the generator runs
- **THEN** it fails with a descriptive error that names both colliding options.

### Requirement: Round-trip ABAPDoc markers

Every emitted `TYPES` and `METHODS` declaration SHALL carry an ABAPDoc comment that ties it back to the OpenAPI specification, enabling bidirectional traceability.

#### Scenario: Schema marker

- **GIVEN** OpenAPI schema `Pet`
- **WHEN** the generator emits the corresponding Layer-1 entry
- **THEN** the `TYPES` declaration is preceded by the comment line `"! @openapi-schema Pet`.

#### Scenario: Operation marker

- **GIVEN** operation `findPetsByStatus` on `GET /pet/findByStatus`
- **WHEN** the generator emits the corresponding Layer-2 method
- **THEN** the `METHODS` declaration is preceded by `"! @openapi-operation findPetsByStatus` and `"! @openapi-path GET /pet/findByStatus`.

#### Scenario: $ref marker

- **GIVEN** a structure field whose ABAP type was derived from `$ref: '#/components/schemas/Category'`
- **WHEN** the field is emitted
- **THEN** its declaration is preceded by `"! @openapi-ref #/components/schemas/Category`.

### Requirement: Deterministic output

Regenerating from identical inputs SHALL produce byte-identical files.

#### Scenario: Idempotent regeneration

- **GIVEN** a previously generated bundle committed to git
- **WHEN** the same `openai-codegen` command is re-run with the same inputs
- **THEN** `git diff` reports no changes.

### Requirement: Abaplint-clean output

The generated ABAP SHALL parse under `@abaplint/core` with zero fatal `parser_error` issues.

#### Scenario: Petstore parse check

- **GIVEN** `samples/petstore3-client/generated/abapgit/`
- **WHEN** abaplint is run across every `*.abap` file
- **THEN** no issue of key `parser_error` is reported.

### Requirement: Cross-tenant compatibility

Every generated `VSEOCLASS` and `VSEOINTERF` metadata file SHALL carry `<ABAP_LANGUAGE_VERSION>5</ABAP_LANGUAGE_VERSION>` so the bundle can be imported through abapGit on BTP Steampunk and other modern tenants.

#### Scenario: Language-version header on every clas.xml / intf.xml

- **WHEN** the bundle is written
- **THEN** every `*.clas.xml` and `*.intf.xml` file contains the XML element `<ABAP_LANGUAGE_VERSION>5</ABAP_LANGUAGE_VERSION>`.

### Requirement: Fetch transport is opinion-free

The local class method `lcl_http->fetch` SHALL NOT reference any OpenAPI type, status code, or JSON encoding. Status-code dispatch and JSON serialization/deserialization SHALL live exclusively in the per-operation methods of `ZCL_<base>`.

#### Scenario: No types in lcl_http

- **WHEN** `zcl_<base>.clas.locals_imp.abap` is scanned
- **THEN** no reference to `ZIF_<base>_TYPES=>`, to specific HTTP status codes (`200`, `404`, etc.), or to `/ui2/cl_json` appears inside the `lcl_http` class body.

#### Scenario: Dispatch in Layer-3

- **WHEN** `zcl_<base>.clas.abap` is scanned for a given operation method
- **THEN** the status-code `CASE` block and the `json=>parse(...)->to(...)` calls appear in that method body, not in `lcl_http`.

### Requirement: `json=>` API mirrors `abapify/json`

The bundled `json` local class SHALL expose three static methods: `stringify( data ) RETURNING VALUE(result) TYPE string`, `render( data ) RETURNING VALUE(result) TYPE xstring`, and `parse( any ) RETURNING VALUE(parser) TYPE REF TO lcl_json_parser` where `parser->to( REF #( target ) )` deserializes into a Layer-1 typed target.

#### Scenario: Stringify primitive

- **WHEN** `json=>stringify( data = abap_true )` is emitted inside an operation method
- **THEN** the generated call matches the `abapify/json` stringify shape.

#### Scenario: Parse into typed target

- **WHEN** an operation deserializes a 200 response
- **THEN** the emitted code is `json=>parse( response->body( ) )->to( REF #( result ) ).` where `result` has a Layer-1 type.

### Requirement: `lcl_http->fetch` signature mirrors `abapify/fetch`

The `lcl_http->fetch` method SHALL have the signature `IMPORTING method TYPE string, path TYPE string, query TYPE ... OPTIONAL, headers TYPE ... OPTIONAL, body TYPE string OPTIONAL, binary TYPE xstring OPTIONAL RETURNING VALUE(response) TYPE REF TO lcl_response`, and `lcl_response` SHALL expose `status( )`, `body( )`, `text( )`, `header( name )`, and `headers( )`.

#### Scenario: Fetch shape

- **WHEN** a Layer-3 method calls the transport
- **THEN** the emitted call uses named arguments `method = ... path = ... query = ... headers = ...` and captures a single `REF TO lcl_response` result.

#### Scenario: Response accessors

- **WHEN** the generated code inspects a response
- **THEN** it does so exclusively through `response->status( )`, `response->body( )`, `response->text( )`, `response->header( name )`, or `response->headers( )`.
