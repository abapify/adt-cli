---
title: '@abapify/openai-codegen'
description: Deterministic OpenAPI → ABAP client code generator for SAP Cloud (Steampunk).
---

# @abapify/openai-codegen

Deterministic OpenAPI → ABAP client code generator. Reads an OpenAPI 3 spec
and emits a **single ABAP class** (plus a generated `ZCX_…_ERROR` exception
class) that is 100% typed to the spec, carries an inline zero-dependency
JSON runtime, and is packaged as either abapGit or gCTS for direct deploy
into SAP BTP (Steampunk) ABAP Cloud. The generator has no ABAP-side runtime
dependency, no LLM, and no network side-effects — given the same inputs it
produces byte-identical output.

## Install

```bash
bun add -D @abapify/openai-codegen
```

## CLI usage

```bash
bunx openai-codegen \
  --input ./spec/openapi.json \
  --out ./generated/abapgit \
  --target s4-cloud \
  --format abapgit \
  --class-name ZCL_PETSTORE3_CLIENT \
  --type-prefix ps3 \
  --description "Petstore v3 client"
```

| Flag                         | Required | Description                                                                                  |
| ---------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `-i, --input <path>`         | yes      | Path or URL to an OpenAPI spec (JSON or YAML).                                               |
| `-o, --out <dir>`            | yes      | Output directory. When multiple formats are requested, each layout goes into a subdirectory. |
| `-t, --target <profile>`     | no       | Target SAP system profile: `s4-cloud` (default), `s4-onprem-modern`, `on-prem-classic`.      |
| `-f, --format <list>`        | no       | Comma-separated layouts: `abapgit`, `gcts`, or `abapgit,gcts`. Default `abapgit`.            |
| `-c, --class-name <name>`    | yes      | Uppercase ABAP class name, e.g. `ZCL_PETSTORE3_CLIENT`.                                      |
| `-p, --type-prefix <prefix>` | yes      | Lower-case type prefix (no `ty_`, no trailing underscore). `ps3` produces `ty_ps3_pet`.      |
| `-d, --description <text>`   | no       | Short description written into the generated `.clas.xml` `DESCRIPT` attribute.               |

### Multi-format example

```bash
bunx openai-codegen \
  --input ./spec/openapi.json \
  --out ./generated \
  --format abapgit,gcts \
  --class-name ZCL_PETSTORE3_CLIENT \
  --type-prefix ps3
# writes ./generated/abapgit/... and ./generated/gcts/...
```

## Library usage

```ts
import { generate } from '@abapify/openai-codegen';

const result = await generate({
  input: './spec/openapi.json',
  outDir: './generated/abapgit',
  target: 's4-cloud',
  format: 'abapgit',
  className: 'ZCL_PETSTORE3_CLIENT',
  typePrefix: 'ps3',
  description: 'Petstore v3 client',
});

console.log(
  `wrote ${result.files.length} files — ${result.typeCount} types, ` +
    `${result.operationCount} operations`,
);
```

`generate()` returns the list of written files plus the concatenated
source string, so callers can hash it for caching or feed it into a
compile-check pipeline without re-reading from disk.

## Pipeline

```text
OpenAPI spec (JSON/YAML or URL)
  → loadSpec           ($ref deref + validation via @apidevtools/swagger-parser)
  → planTypes          (name allocation + cycle detection)
  → getCloudRuntime    (inline HTTP/URL/JSON helpers)
  → emitClientClass    (build @abapify/abap-ast ClassDef + extras)
  → print              (deterministic pretty-print)
  → inject runtime     (splice raw runtime into PRIVATE SECTION + IMPLEMENTATION)
  → writeLayout        (abapGit or gCTS on-disk tree)
```

The pipeline is intentionally boring: every step is a pure function of
the previous one, there is no global state, and the only non-determinism
(network fetching of a spec referenced by URL) happens up front in
`loadSpec`.

## OpenAPI → ABAP type mapping

| OpenAPI / JSON Schema                       | ABAP                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `string`                                    | `string` (or `d`/`t`/`timestampl` for `format: date` / `date-time` etc.)  |
| `integer` / `integer format:int64`          | `i` / `int8`                                                              |
| `number`                                    | `decfloat34`                                                              |
| `boolean`                                   | `abap_bool`                                                               |
| `array` of `X`                              | `STANDARD TABLE OF ty_<X>`                                                |
| `object` with `properties`                  | `BEGIN OF ty_<name> … END OF ty_<name>` (flat or nested)                  |
| `enum`                                      | Emitted as a sealed set of constants + alias to the base scalar type      |
| `allOf: [A, B]`                             | Flattened into a single structure (`INCLUDE` semantics)                   |
| `oneOf` / `anyOf` **with** `discriminator`  | Tagged union: discriminator field + per-branch `TYPES ty_<name>_<branch>` |
| `oneOf` / `anyOf` **without** discriminator | Lowered to the nearest common ancestor (`string` fallback where needed)   |
| `nullable: true`                            | Mapped field kept; null values round-trip through the inline JSON runtime |
| `additionalProperties`                      | Emitted as a generic name/value table alongside the typed fields          |
| `$ref`                                      | Resolved, deduped, and reused across operations                           |

Cycles are detected by `planTypes` and broken with a stable name-based
ordering — the generator never loops and never emits an undefined type.

## Target profiles

| Profile            | Status in v1                  | HTTP strategy                                         | JSON strategy         |
| ------------------ | ----------------------------- | ----------------------------------------------------- | --------------------- |
| `s4-cloud`         | Fully emitted                 | `if_web_http_client` + `cl_http_destination_provider` | Inline (no `cl_json`) |
| `s4-onprem-modern` | Profile defined, runtime stub | `if_web_http_client` via destination                  | Inline                |
| `on-prem-classic`  | Profile defined, runtime stub | `cl_http_client` legacy factory                       | Inline                |

The v1 CLI rejects non-cloud targets with a clear error. The profile
definitions exist so that future runtimes can be slotted in without any
change to the planner or the emitter.

## Output layouts

### abapGit (`--format abapgit`)

```text
out/
├── package.devc.xml
└── src/
    ├── zcl_petstore3_client.clas.abap
    ├── zcl_petstore3_client.clas.xml
    ├── zcx_petstore3_client_error.clas.abap
    └── zcx_petstore3_client_error.clas.xml
```

### gCTS (`--format gcts`)

```text
out/
├── package.devc.json
└── CLAS/
    ├── zcl_petstore3_client/
    │   ├── zcl_petstore3_client.clas.abap
    │   └── zcl_petstore3_client.clas.json
    └── zcx_petstore3_client_error/
        ├── zcx_petstore3_client_error.clas.abap
        └── zcx_petstore3_client_error.clas.json
```

Both layouts carry the same generated ABAP source; the only difference
is the metadata representation. See
[`adt-plugin-abapgit`](./adt-plugin-abapgit) and
[`adt-plugin-gcts`](./adt-plugin-gcts) for the deploy-side plugins.

## End-to-end proof

The `samples/petstore3-client/` project in the monorepo is the live
end-to-end fixture. It vendors a Petstore v3 OpenAPI spec, commits the
generated ABAP (both layouts), and ships a hand-written AUnit test class
that references the generated types from the outside. The generated
artefacts have been deployed to SAP BTP Steampunk tenants via
`adt-cli deploy --activate` — activation against the real ABAP Cloud
whitelist is the strongest practical correctness signal for the
generator. See `samples/petstore3-client/e2e/README.md` for the
reproducible commands and the observed results on live systems.

## Out of scope (v1)

- Per-type JSON serializer/deserializer **bodies** — the runtime
  tokenizer is inline, but the typed marshallers are stubbed and will be
  emitted in a follow-up change.
- Non-cloud runtime emission (`s4-onprem-modern`, `on-prem-classic`) —
  only the profile definitions exist today.
- OpenAPI webhooks and callbacks.
- Full OAuth2 / OpenID Connect flows — only an `ON_AUTHORIZE` hook is
  generated; `apiKey`, `http bearer`, and `http basic` are fully
  supported.
- Streaming / SSE responses.
- `.aclass` DSL parser — tracked under [`abap-ast`](./abap-ast) as a
  future parser that targets the same AST.

## See also

- [`abap-ast`](./abap-ast) — the AST and printer the emitter is built on.
- [`adt-cli`](./adt-cli) — used to deploy and activate the generated
  artefacts against a live SAP system.
- [`adt-plugin-abapgit`](./adt-plugin-abapgit),
  [`adt-plugin-gcts`](./adt-plugin-gcts) — the on-disk formats this
  generator writes to.
