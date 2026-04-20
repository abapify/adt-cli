---
description: ABAP Cloud (Steampunk/BTP) kernel API and activation gotchas discovered by live testing on TRL during openai-codegen PR #109. Use when generating or validating ABAP code targeting the `s4-cloud` profile, when hitting activation errors from `/sap/bc/adt/activation`, or when deploying via `adt deploy --activate --unlock`.
globs:
decision: model_decision
---

# Steampunk Kernel API + Activation Gotchas

All items below were reproduced live on a BTP ABAP Cloud tenant (TRL, us10). Each one maps to a specific SAP activation error; do not second-guess them when generating or reviewing code for the `s4-cloud` profile.

## Kernel API signatures / class names

- **`cl_http_destination_provider=>create_by_destination`** — the importing parameter is `i_destination` (of `rfcdest`). Not `i_name`, not `i_destination_name`. SAP reports `The formal parameter "I_NAME" does not exist` / `I_DESTINATION_NAME does not exist` otherwise.
- **Response header table type** — use `if_web_http_request=>name_value_pairs`. `if_web_http_response=>name_value_pairs` does NOT exist on cloud and activation raises `MESSAGE(GTH) Type "NAME_VALUE_PAIRS" is unknown`.
- **Binary request body** — `if_web_http_request->set_binary( i_data = … )`. Not `set_binary_body` (method doesn't exist on cloud).
- **HTTP method constants / SWITCH type** — `if_web_http_client=>get|post|put|delete|patch|head|options`. The `SWITCH` that maps the string to the verb must produce type `if_web_http_client=>method`, not plain `string` — generation fails otherwise.
- **URL escaping** — `cl_web_http_utility=>escape_url( unescaped = … )` (static method). `cl_http_utility` is NOT whitelisted on ABAP Cloud.
- **RTTI** — `DESCRIBE FIELD` is disallowed. Use `cl_abap_typedescr=>describe_by_data( … )->type_kind` and constants on `cl_abap_typedescr`.
- **`/ui2/cl_json`** — IS released for ABAP for Cloud Development (SAP Note 2931335) despite the `/…/` namespace. Keep it in the cloud whitelist; JSON strategy = `ui2_cl_json`.

## Class structure

- `INTERFACES` declarations MUST live inside PUBLIC SECTION, not at class-body level. Otherwise activation reports `There is no PUBLIC/PROTECTED/PRIVATE SECTION statement`.
- Table types cannot be declared inline (`STANDARD TABLE OF X`) in METHOD signatures. Emit named TYPES aliases (`pet_list`, `string_list`, …) at the head of the interface.
- Methods calling `cx_web_http_client_error` / `cx_http_dest_provider_error` APIs must either declare them in `RAISING` or catch them. Preferred pattern: wrap the method body in `TRY … CATCH cx_web_http_client_error cx_http_dest_provider_error INTO _http_err. RAISE EXCEPTION NEW zcx_<base>_error( status = 0 description = _http_err->get_text( ) ). ENDTRY.`
- `lcl_http.fetch` (or any wrapper around `cl_web_http_client_manager`) must use `TRY … CLEANUP. client->close( ). ENDTRY.` so the HTTP client is closed on kernel exceptions.

## Query parameters

- Array query parameters require a FOR-loop comprehension inside `VALUE #( ... )`:
  ```abap
  query = VALUE #( FOR _tags IN tags ( name = 'tags' value = _tags ) )
  ```
  Assigning a `string_list` directly to `value` fails activation with `MESSAGE(GXD) The type of "TAGS" cannot be converted to the type of "VALUE"`.

## Package and language-version rules

- **POST/PUT payloads MUST NOT carry `abapLanguageVersion`** — SAP infers it from the target package. (See `packages/adk/src/base/model.ts` and `.agents/rules/adt/adk-save-logic.md`.)
- **gCTS metadata envelopes (`*.clas.json`, `*.intf.json`) MUST include `"abapLanguageVersion": "5"`** in the `header` block. Without it gCTS imports default to Standard ABAP and the object fails to activate on BTP (S_ABPLNGVS / 403).
- `$TMP` is NOT writable on BTP for the service account (S_ABPLNGVS / 403). Always deploy to a user-owned Z-package with developer auth (example: `ZPEPL`).

## Deploy + activation

- `adt deploy --activate` activates the CLAS/OC wrapper only. It does NOT activate class includes. For full activation after regenerating, POST `/sap/bc/adt/activation?method=activate&preauditRequested=false` with explicit `objectReference` URIs for CLAS/OC + CLAS/OCN/definitions + CLAS/OCN/implementations.
- An activation response of `activationExecuted="false" generationExecuted="true"` with no `<msg type="E">` means SAP's pre-audit was clean and there was nothing inactive to activate. This is the expected GREEN state, not a failure.
- **abapGit deserializer glob is recursive**: `fileTree.glob('**/*.abap')` in `packages/adt-plugin-abapgit/src/lib/deserializer.ts` picks up files from sibling subdirs. If you generate both `abapgit/` and `gcts/` layouts under the same parent, always deploy from the format-specific subdir (`generated/abapgit/`) or an isolated clean copy. Otherwise stale sibling files can be silently included and ADK will report `unchanged` against the wrong local state.

## Reference PR

`feat/openai-codegen` / PR #109 — commits `b1bb602e`…`b495ab67` each map to one or more of these constraints; see commit messages for the exact activation error that drove each fix.
