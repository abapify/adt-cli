# E12 — RAP: Service Binding (SRVB) CLI + extended MCP

## Mission

Promote the existing MCP `publish_service_binding` tool to a full SRVB lifecycle: CLI command + MCP tools for create / read / publish / unpublish / delete service bindings.

## Why

We already have a publish/unpublish MCP tool but no CLI surface. Without CLI, CI/CD scripts can't (un)publish bindings. SRVB completes the BDEF → SRVD → SRVB triplet for RAP.

## Dependencies

- Blocked by: none (independent of E09 — SRVB is metadata, no DDL parsing)
- Blocks: nothing

## References

- ADT endpoint: `/sap/bc/adt/businessservices/bindings/{name}`
- Existing MCP tool: `packages/adt-mcp/src/lib/tools/publish-service-binding.ts`
- abapGit handler: `zcl_abapgit_object_srvb`

## Scope — files

### Add

```
packages/adt-contracts/src/adt/businessservices/bindings.ts
packages/adt-contracts/src/adt/businessservices/index.ts
packages/adt-contracts/tests/contracts/srvb.test.ts
packages/adt-fixtures/src/fixtures/businessservices/binding.xml
packages/adk/src/objects/repository/srvb/srvb.model.ts
packages/adk/tests/srvb.test.ts
packages/adt-cli/src/lib/commands/srvb/index.ts                  # `adt srvb <crud|publish|unpublish>`
packages/adt-mcp/src/lib/tools/{get-srvb,create-srvb,delete-srvb,unpublish-srvb}.ts
packages/adt-cli/tests/e2e/parity.srvb.test.ts
packages/adt-plugin-abapgit/src/lib/handlers/objects/srvb.ts
```

### Modify

```
packages/adt-contracts/src/adt/index.ts                          # register businessservices
packages/adt-cli/src/lib/cli.ts
packages/adt-mcp/src/lib/tools/index.ts
packages/adt-mcp/src/lib/tools/publish-service-binding.ts         # may consolidate or keep as-is
packages/adt-mcp/src/lib/tools/object-creation.ts                 # SRVB dispatch
packages/adt-mcp/src/lib/tools/delete-object.ts                   # SRVB dispatch
packages/adt-fixtures/src/fixtures/registry.ts
packages/adt-fixtures/src/mock-server/routes.ts
packages/adt-plugin-abapgit/src/lib/filename/adt-uri-to-path.ts
packages/adt-plugin-abapgit/tests/filename/adt-uri-to-path.test.ts
```

## Out of scope

- BDEF (E10), SRVD (E11).

## Tests

- Contract: 4+
- Parity: 6+ (CRUD + publish + unpublish)
- abapGit handler: 3+

## Acceptance

```bash
bunx nx run-many -t build,test -p adt-contracts adk adt-cli adt-mcp adt-plugin-abapgit
bunx nx typecheck && bunx nx lint && bunx nx format:write
```

## Devin prompt

```
Spec: /mnt/wsl/workspace/ubuntu/adt-cli/docs/roadmap/epics/e12-rap-srvb.md
Reads: AGENTS.md, docs/roadmap/README.md, packages/adt-mcp/src/lib/tools/publish-service-binding.ts.
Do NOT commit without approval.
```

## Status: Landed

- Contract: `client.adt.businessservices.bindings.*` at
  `/sap/bc/adt/businessservices/bindings` (GET/POST/PUT/DELETE +
  lock/unlock + `publish` / `unpublish` on `/publishedstates`).
  Content-Type
  `application/vnd.sap.adt.businessservices.servicebinding.v1+xml`.
  Built on the `crud()` helper with the publish/unpublish endpoints
  spliced on top. SRVB is metadata-only — no source text endpoints.
- Schema: `sap/servicebinding.xsd` added to the adt-schemas target
  list; regenerated `@abapify/adt-schemas` types + `@abapify/adt-contracts`
  speci wrappers (`servicebinding` typed schema).
- ADK: `AdkServiceBinding` (lightweight metadata-only object).
  `getMetadata()`, `publish()`, `unpublish()`, `activate()` + full
  lock/unlock via `ctx.lockService`. `getSource()` returns `''` for
  uniform CLI parity.
- CLI: `adt srvb <create|read|publish|unpublish|activate|delete>`
  (custom command — `buildObjectCrudCommands` doesn't cover
  publish/unpublish, and SRVB has no source so read/write differ from
  siblings).
- MCP:
  - `get_srvb`, `create_srvb`, `delete_srvb`, `unpublish_srvb` new
    dedicated tools.
  - `publish_service_binding` retained for backward compatibility, now
    **delegates to the typed SRVB contract** (no more
    `client.fetch()` bypass). Accepts `unpublish: true` for legacy
    callers.
  - `create_object` / `delete_object` / `resolveObjectUriFromType`
    dispatch extended to include SRVB.
- abapGit handler: `zui_name.srvb.xml` (metadata-only — no source
  file). SRVB added to abapgit plugin's XSD set + codegen regenerated.
  Handler emits a minimal SKEY + BINDING block mirroring the upstream
  `zcl_abapgit_object_srvb` conservative serializer.
- Filename mapping: `adtUriToAbapGitPath()` extended for SRVB URIs
  (including the `/publishedstates` suffix) + 2 new test cases.
- Mock server: SRVB routes (GET/POST/PUT/DELETE + POST/DELETE on
  `/publishedstates`).
- Fixtures: `businessservices/binding.xml` (synthetic envelope mirroring
  the official `servicebinding.xsd` — no public S/4HANA sample
  available).

Tests: +22 contract scenarios, +11 ADK, +3 abapgit handler, +2 filename,
+6 parity = **44 new tests**. Full green across adt-contracts (480),
adk + abapgit (241 + 79). Typecheck + lint + format all green.
`adt-cli`'s 5 pre-existing `object-uri.test.ts` failures remain
(unrelated to SRVB — verified by stashing changes; confirmed failing on
baseline).

Follow-ups:

- Replace synthetic `businessservices/binding.xml` fixture with a real
  sanitized capture from a live S/4HANA system when one becomes
  available.
- abapGit SRVB XML layout needs verification against upstream
  `zcl_abapgit_object_srvb` when public clone available.
- Pre-existing `adt-cli/src/lib/utils/object-uri.test.ts` failures
  remain — separate cleanup epic.

## Real-SAP verification (TRL 2025-11)

- `GET /sap/bc/adt/businessservices/bindings/<name>` returns **HTTP 406
  Not Acceptable** for the standard binding vendor MIME on TRL. The
  `/publishedstates` sub-endpoint returns **HTTP 404** on TRL for the
  same names. Override via `ADT_REAL_SRVB_NAME=<NAME>` on a system
  with a reachable binding to capture real responses.
