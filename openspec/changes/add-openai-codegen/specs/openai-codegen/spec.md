# Delta — `openai-codegen` capability (new)

## ADDED Requirements

### Requirement: Deterministic OpenAPI → ABAP class generation

The `@abapify/openai-codegen` CLI SHALL convert an OpenAPI 3.0.x / 3.1.x specification into a single ABAP class whose public interface maps 1:1 onto the spec's operations and schemas, such that regenerating from the same input always produces byte-identical output.

#### Scenario: Generating the Petstore v3 client

- **GIVEN** the vendored `samples/petstore3-client/spec/openapi.json`
- **WHEN** `openai-codegen --input ./spec/openapi.json --out ./generated/abapgit --target s4-cloud --format abapgit --class-name ZCL_PETSTORE3_CLIENT --type-prefix ZPS3_` is executed
- **THEN** an abapGit-layout directory is written containing `ZCL_PETSTORE3_CLIENT.clas.abap`, `ZCL_PETSTORE3_CLIENT.clas.xml`, and package manifest files, and re-running the same command leaves `git diff` empty.

#### Scenario: Every schema becomes a typed ABAP TYPES entry

- **GIVEN** an OpenAPI spec with `components.schemas.Pet` referencing `Category` and `Tag`
- **WHEN** the generator runs
- **THEN** the emitted class contains a `TYPES: BEGIN OF ty_ps3_pet ... END OF ty_ps3_pet.` structure whose fields have ABAP types derived from `Category` and `Tag` (themselves emitted as TYPES), and topological ordering ensures referenced types appear before references.

#### Scenario: Every operation becomes an ABAP method

- **GIVEN** operation `findPetsByStatus` with a `query` parameter and a 200 response returning `array of Pet`
- **WHEN** the generator runs
- **THEN** the emitted class has method `FIND_PETS_BY_STATUS` with `IMPORTING iv_status TYPE string` and `RETURNING VALUE(rt_pets) TYPE <pet table type>`, and the body serializes the query parameter per its `style`/`explode`, sends the HTTP request, and deserializes the JSON response into `rt_pets`.

### Requirement: Zero runtime dependencies in generated ABAP

The generated ABAP class targeting `s4-cloud` SHALL only reference system classes on the Steampunk-cloud whitelist (`cl_web_http_client_manager`, `cl_http_destination_provider`, `cl_http_utility`, `cl_system_uuid`, `cl_abap_char_utilities`), with no dependency on `/ui2/cl_json` or any non-kernel class.

#### Scenario: JSON without /ui2/cl_json

- **WHEN** the generator targets `s4-cloud`
- **THEN** the emitted class contains inline private methods for JSON tokenization and per-type serialization/deserialization, and the class does not reference `/ui2/cl_json` or `xco_cp_json` in its source.

#### Scenario: Whitelist enforcement

- **WHEN** the emitter is asked to reference a class that is not on the active profile's whitelist
- **THEN** the generator fails with a descriptive error naming the class and the active profile.

### Requirement: Output format abstraction

The generator SHALL package the emitted class as either an abapGit directory layout or a gCTS payload, selectable via `--format`.

#### Scenario: abapGit layout

- **WHEN** `--format abapgit` is passed
- **THEN** the output directory contains `<CLASS>.clas.abap`, `<CLASS>.clas.xml`, and a `package.devc.xml` in conventional abapGit structure, suitable for `adt-plugin-abapgit` import.

#### Scenario: gCTS layout

- **WHEN** `--format gcts` is passed
- **THEN** the output directory contains the class artefacts in the gCTS-expected structure, suitable for `adt-plugin-gcts` import.

### Requirement: Target-profile class whitelist

Each target profile SHALL declare the set of kernel classes its emitted ABAP may reference, and the generator SHALL refuse to emit references outside that set.

#### Scenario: Cloud profile whitelist

- **GIVEN** `--target s4-cloud`
- **THEN** the emitter restricts HTTP to `cl_web_http_client_manager` / `cl_http_destination_provider` and rejects any attempt to emit `cl_http_client=>create_by_destination`.
