# petstore3-client (sample)

End-to-end proof project for `@abapify/openai-codegen`.

## What this is

- **Input:** `spec/openapi.json` — vendored Swagger Petstore v3 OpenAPI 3.0 spec (`https://petstore3.swagger.io/api/v3/openapi.json`).
- **Output:** `generated/abapgit/` and `generated/gcts/` — a single zero-dependency ABAP class (`ZCL_PETSTORE3_CLIENT`) targeting the **s4-cloud** (BTP Steampunk) profile, packaged in both formats.
- **Testing:** deployed to a real ABAP Cloud system (`TRL`) via `adt-cli`, exercised with `adt abap run` and ABAP Unit tests.

## Commands

```bash
bun run generate          # regenerate both abapgit and gcts layouts
bun run generate:abapgit  # abapGit only
bun run generate:gcts     # gCTS only
```

## Deploy & run (requires authenticated `adt-cli` session, e.g. `TRL`)

```bash
bunx adt deploy ./generated/abapgit --package $TMP
bunx adt abap run ./e2e/smoke.abap
bunx adt aunit zcl_petstore3_client_tests
```

See `e2e/` for the runnable smoke snippets and ABAP Unit test class.
