# @abapify/openai-codegen

**Deterministic OpenAPI → ABAP client code generator.** Reads an OpenAPI
3.x spec and emits a single zero-runtime-dependency ABAP class per spec,
packaged as abapGit or gCTS for deployment to SAP BTP / Steampunk or any
other ABAP system.

Re-running the generator with the same inputs produces byte-identical
output — generated artefacts are safe to commit and diff.

## Features

- **One class per spec.** All operations become `METHODS`; all schemas
  become `TYPES` in the same class.
- **Zero ABAP dependencies.** The emitted class carries an inline HTTP +
  JSON + URL runtime — no `/ui2/cl_json`, no `xco_cp_json`, nothing
  outside the `s4-cloud` kernel whitelist.
- **Typed.** Full JSON Schema 2020-12 subset (primitives, objects, arrays,
  enums, `$ref`, `allOf`, `oneOf`/`anyOf` with discriminator, `nullable`,
  `additionalProperties`).
- **Security.** `apiKey`, `http bearer`, `http basic` emitted inline. `oauth2`
  / `openIdConnect` exposed via an overridable `ON_AUTHORIZE` hook.
- **Two packaging layouts.** `abapgit` or `gcts` (or both at once).
- **CLI + library.** Ship it in a build step or drive it from code.

## Installation

```bash
bun add -D @abapify/openai-codegen
```

## CLI usage

```bash
bunx openai-codegen \
  --input ./petstore3.json \
  --out ./out \
  --target s4-cloud \
  --format abapgit \
  --class-name ZCL_PETSTORE3_CLIENT \
  --type-prefix ps3 \
  --description "Petstore v3 client"
```

The `--format` flag accepts a comma-separated list (`abapgit,gcts`) to
produce both layouts in one invocation; each lands in its own
`<out>/<format>/…` subdirectory.

| Flag                | Required | Notes                                                           |
| ------------------- | -------- | --------------------------------------------------------------- |
| `-i, --input`       | yes      | Path or URL to the OpenAPI spec (JSON or YAML).                 |
| `-o, --out`         | yes      | Output directory.                                               |
| `-t, --target`      | no       | `s4-cloud` (default, only profile implemented in v1).           |
| `-f, --format`      | no       | `abapgit` (default), `gcts`, or `abapgit,gcts`.                 |
| `-c, --class-name`  | yes      | Uppercase ABAP class name, e.g. `ZCL_MY_CLIENT`.                |
| `-p, --type-prefix` | yes      | Lower-case ABAP type prefix (no `ty_`, no trailing underscore). |
| `-d, --description` | no       | Used in the generated `.clas.xml` `DESCRIPT` field.             |

## Library usage

```typescript
import { generate } from '@abapify/openai-codegen';

const result = await generate({
  input: './petstore3.json',
  outDir: './out/abapgit',
  target: 's4-cloud',
  format: 'abapgit',
  className: 'ZCL_PETSTORE3_CLIENT',
  typePrefix: 'ps3',
  description: 'Petstore v3 client',
});

console.log(result.files); // written file paths (sorted, deduped)
console.log(result.typeCount, result.operationCount);
```

`result.source` is the full concatenated ABAP source (main class +
generated `ZCX_*_ERROR` exception class), useful for parse-checking with
`@abaplint/core`.

## Pipeline

```
OpenAPI spec (JSON/YAML, file or URL)
   │
   ▼ oas/       load + $ref-dereference via @apidevtools/swagger-parser
NormalizedSpec
   │
   ▼ types/    plan types (topological, deduped, prefixed)
TypePlan (TypeDef[] in topological order)
   │
   ▼ emit/     per-operation METHOD, importing/returning/raising,
   │          security support, server constants, exception class
ClassDef + LocalClassDef[]  (pure @abapify/abap-ast AST)
   │
   ▼ print()   from @abapify/abap-ast (deterministic, configurable)
ABAP source (string)
   │
   ▼ inject inline HTTP/URL/JSON runtime at section boundaries
   │       + strip line-only comments
Final ABAP source
   │
   ▼ format/   write abapGit or gCTS layout (xml/json envelopes)
On-disk artefacts
```

The AST is the **only** source of ABAP structure, with one controlled
exception: the inline runtime is injected as pre-formatted strings at the
`PRIVATE SECTION` and `IMPLEMENTATION` boundaries (see `generate.ts`
`injectRuntime`). That trade-off is explained in detail in
[`AGENTS.md`](AGENTS.md).

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
| `array`                                   | `STANDARD TABLE OF <rowType> WITH DEFAULT KEY`              |
| `object` (properties)                     | `TYPES: BEGIN OF ty_<name> … END OF ty_<name>.`             |
| `object` with `additionalProperties` only | key/value table (`ty_<name>_entry` rows with `key`/`value`) |
| `enum`                                    | `TYPES: BEGIN OF ENUM ty_<name> BASE TYPE … END OF ENUM.`   |
| `$ref`                                    | `NamedTypeRef` into the existing plan entry.                |
| `allOf`                                   | Flattened into one structure (INCLUDE-style merge).         |
| `oneOf` / `anyOf` with `discriminator`    | Tagged union struct carrying the discriminator field.       |
| `oneOf` / `anyOf` without discriminator   | `string` payload + structured comment (escape hatch).       |
| `nullable: true`                          | Same ABAP type — nullability handled at (de)serialisation.  |

Unknown or unsupported combinations surface as `UnsupportedSchemaError`
(from `src/types/errors.ts`) so the build fails loudly rather than
producing silent wrong output.

## Target profiles

| Profile id         | Status      | Runtime                                                            |
| ------------------ | ----------- | ------------------------------------------------------------------ |
| `s4-cloud`         | implemented | `if_web_http_client` + `cl_http_destination_provider`, inline JSON |
| `s4-onprem-modern` | declared    | `if_web_http_client` + `/ui2/cl_json` (not emitted in v1)          |
| `on-prem-classic`  | declared    | `if_http_client` + `/ui2/cl_json` (not emitted in v1)              |

The `s4-cloud` profile whitelists only kernel classes available on the
Steampunk allow-list: `cl_web_http_client_manager`,
`cl_http_destination_provider`, `if_web_http_client`, `if_web_http_request`,
`if_web_http_response`, `cl_http_utility`, `cl_system_uuid`,
`cl_abap_char_utilities`, `cl_abap_conv_codepage`, `cl_abap_codepage`,
`cl_abap_conv_out_ce`, `cl_abap_conv_in_ce`. Any emission that tries to
reference a class outside this set raises `WhitelistViolationError`.

## Output layout

### abapGit (`--format abapgit`)

```
<outDir>/
  package.devc.xml
  src/
    <class>.clas.abap
    <class>.clas.xml
    <class>_error.clas.abap      # ZCX_<CLASS>_ERROR global class
    <class>_error.clas.xml
```

### gCTS (`--format gcts`)

```
<outDir>/
  CLAS/
    <class>/
      <class>.clas.abap
      <class>.clas.json
    <class>_error/
      <class>_error.clas.abap
      <class>_error.clas.json
```

Both layouts carry `ABAP_LANGUAGE_VERSION=5` (Cloud) in the metadata
envelope.

## Live-deploy note

The authoritative end-to-end write-up lives in
[`samples/petstore3-client/e2e/README.md`](../../samples/petstore3-client/e2e/README.md).
It covers spinning up a writable ABAP package on `<your-btp-tenant>`,
importing the generated abapGit layout via `adt-cli`, running the smoke
snippet, and executing the generated ABAP Unit test class. Do **not**
target `$TMP` on BTP unless your role grants `S_ABPLNGVS` for it — use a
tenant package such as `ZMY_PACKAGE` instead.

## Out of scope (v1)

- Per-type dedicated serialiser / deserialiser method bodies (v1 uses a
  single reflective JSON runtime).
- On-prem runtimes (`s4-onprem-modern`, `on-prem-classic` emission).
- OpenAPI webhooks.
- OpenAPI callbacks.
- Full OAuth2 client-credentials / authorization-code flows (only the
  `ON_AUTHORIZE` hook is emitted).
- Streaming / Server-Sent Events responses.
- `.aclass` DSL parser (will live in `@abapify/abap-ast` once the parser
  layer lands).

## License

MIT
