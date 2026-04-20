# petstore3-client (sample)

End-to-end proof project for `@abapify/openai-codegen`.

## What this is

- **Input:** `spec/openapi.json` — vendored Swagger Petstore v3 OpenAPI 3.0 spec (`https://petstore3.swagger.io/api/v3/openapi.json`).
- **Output:** `generated/src/` (abapGit layout) and `generated/gcts/` (gCTS layout) — eleven files per spec (`zif_petstore3_types.intf`, `zif_petstore3.intf`, `zcx_petstore3_error.clas`, `zcl_petstore3.clas` + locals_def/locals_imp) targeting the **s4-cloud** (BTP Steampunk) profile.
- **Testing:** deployed to a real ABAP Cloud system via `adt-cli`, exercised with `adt deploy --activate` and ABAP Unit tests (`adt aunit -c ZCL_PS3_CLIENT_TESTS`).

## Commands

```bash
bun run generate          # regenerate both abapgit and gcts layouts
bun run generate:abapgit  # abapGit only
bun run generate:gcts     # gCTS only
```

## Deploy & run (requires authenticated `adt-cli` session)

```bash
# NOTE: on ABAP Cloud / Steampunk the service user typically cannot write
# to $TMP (S_ABPLNGVS / 403). Use a user-owned Z-package that you have
# developer authorization for (e.g. ZPEPL). $TMP is only expected to work
# on classic NetWeaver systems where the auth profile permits it.
bunx adt deploy --source ./generated --package ZPEPL --activate --unlock
bunx adt aunit -c ZCL_PS3_CLIENT_TESTS
```

See `e2e/` for the runnable ABAP Unit test class (`ZCL_PS3_CLIENT_TESTS`) — three
harmless-short tests that verify the constructor binds a `zif_petstore3`
reference and that `zif_petstore3_types=>pet` / `zif_petstore3_types=>order`
structures round-trip via the generated typed interface.
