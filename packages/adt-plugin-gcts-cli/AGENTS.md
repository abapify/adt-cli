# adt-plugin-gcts-cli — AI Agent Guide

## Package purpose

CLI command plugin adding `adt gcts ...` subcommands for SAP gCTS
(git-enabled CTS). This is the **command side** of gCTS; the
serialization side lives in `@abapify/adt-plugin-gcts` (E06).

## Architecture

```
User runs `adt gcts ...`
   ↓
adt-cli resolves plugin via CliContext.getAdtClient() factory
   ↓
src/lib/commands/gcts.ts — CliCommandPlugin tree (repo/branch/...)
   ↓
client.adt.gcts.{repository,branches,commits,config}.*  (typed contracts)
   ↓
HTTP → /sap/bc/cts_abapvcs/*   (separate REST surface — NOT /sap/bc/adt/*)
```

### What this plugin does NOT do

- ❌ Talk to `/sap/bc/adt/` — gCTS has its own `/sap/bc/cts_abapvcs/`
  surface. For ADT transport operations use `adt cts tr *` instead.
- ❌ Serialize objects to files — that's `@abapify/adt-plugin-gcts`.
- ❌ Read user credentials / manage sessions — `adt-cli` handles auth
  and injects an authenticated client via `ctx.getAdtClient()`.

## Key invariants

### 1. Contracts only — no direct HTTP

All network traffic MUST go through `client.adt.gcts.*`. Do not call
`client.fetch('/sap/bc/cts_abapvcs/…')` or construct URLs by hand. If
an endpoint is missing, add a contract to
`packages/adt-contracts/src/adt/gcts/` first.

### 2. JSON-only

gCTS is JSON-native. There are no XSDs. Request/response schemas live
in `packages/adt-contracts/src/adt/gcts/schema.ts` as hand-built
`Serializable<T>` values (same pattern as `datapreview/schema.ts`).

### 3. Commands are thin wrappers

Each subcommand:

1. Resolves the client via `getGctsClient(ctx)`.
2. Calls a single contract method (occasionally two — e.g. `checkout`
   calls `repository.get` first to learn the current branch).
3. Prints either JSON (`--json`) or a human-readable summary.

No business logic lives in the CLI. Multi-step orchestration
(e.g. sapcli's `clone_with_task` polling loop) is deliberately
deferred — add a service under `client.services.gcts` first, then
call it from here.

### 4. Config key casing

sapcli upper-cases config keys (`VCS_TARGET_DIR` etc.). We keep the
user's casing verbatim — gCTS accepts both. If a downstream consumer
reports case mismatches, add a `.toUpperCase()` in `configCmd` and
document it here.

## Adding a new subcommand

1. **Add / extend the contract** in
   `packages/adt-contracts/src/adt/gcts/` (schema + endpoint + contract
   test). Re-run `bunx nx test adt-contracts`.
2. **Add the subcommand** to `src/lib/commands/gcts.ts` using the
   existing `CliCommandPlugin` objects as templates. Keep it under
   ~60 LOC.
3. **Register it** in the appropriate group's `subcommands` array.
4. **Add a mock route** in
   `packages/adt-fixtures/src/mock-server/routes.ts` so the e2e harness
   can exercise the new command.
5. **Extend the parity test**
   (`packages/adt-cli/tests/e2e/parity.gcts.test.ts`) with at least one
   case.

## Typing the client

`CliContext.getAdtClient()` returns `Promise<unknown>`. We declare a
narrow `GctsClient` interface in `src/lib/client/gcts-client.ts` so the
plugin stays self-contained. The shape is copied from
`client.adt.gcts.*` in `@abapify/adt-contracts` — when contracts
change, update this interface first, then the subcommands.

## Build / test

```bash
bunx nx build adt-plugin-gcts-cli
bunx nx test adt-plugin-gcts-cli      # unit tests (zero network)
# integration lives in adt-cli parity tests:
bunx nx test adt-cli -- parity.gcts
```

## Open questions

- **Auth surface.** The epic asked whether gCTS requires a different
  auth (basic vs OAuth) than ADT. Empirically the same `AdtClient`
  session (basic auth + CSRF cookie) works for both surfaces on
  on-premise and BTP-trial systems. Revisit if users report 401s.
- **Overlap with `adt cts tr`.** `adt cts tr *` targets
  `/sap/bc/adt/cts/` (Eclipse ADT transport surface) while `adt gcts
commit --corrnr <TR>` targets `/sap/bc/cts_abapvcs/` (gCTS). They
  are complementary — document in user-facing docs that `gcts commit
--corrnr` only works on systems where gCTS is configured.
