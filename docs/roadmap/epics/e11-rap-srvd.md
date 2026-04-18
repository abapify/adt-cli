# E11 — RAP: Service Definition (SRVD)

## Mission

Add CRUD for SRVD (Service Definition) — defines which CDS root entities/behaviors are exposed via OData. CLI + MCP + ADK + contract.

## Why

Necessary partner of BDEF. Without SRVD, exposed services can't be authored programmatically.

## Dependencies

- Blocked by: **E09** (acds parser)
- Blocks: nothing

## References

- ADT endpoint: `/sap/bc/adt/ddic/srvd/sources/{name}`
- sapcli: no existing module — pioneering
- abapGit handler: `zcl_abapgit_object_srvd`

## Scope — files (mirrors E10 structure)

### Add

```
packages/adt-schemas/.xsd/custom/srvdSource.xsd
packages/adt-contracts/src/adt/ddic/srvd/sources.ts
packages/adt-contracts/src/adt/ddic/srvd/index.ts
packages/adt-contracts/tests/contracts/srvd.test.ts
packages/adt-fixtures/src/fixtures/ddic/srvd/source.{xml,asrvd}
packages/adk/src/objects/repository/srvd/srvd.model.ts
packages/adk/tests/srvd.test.ts
packages/adt-cli/src/lib/commands/srvd/index.ts
packages/adt-mcp/src/lib/tools/{get-srvd,create-srvd,delete-srvd}.ts
packages/adt-cli/tests/e2e/parity.srvd.test.ts
packages/adt-plugin-abapgit/src/lib/handlers/objects/srvd.ts
```

### Modify

```
packages/adt-contracts/src/adt/ddic/index.ts
packages/adt-cli/src/lib/cli.ts
packages/adt-mcp/src/lib/tools/index.ts
packages/adt-mcp/src/lib/tools/object-creation.ts
packages/adt-mcp/src/lib/tools/delete-object.ts
packages/adt-fixtures/src/fixtures/registry.ts
packages/adt-fixtures/src/mock-server/routes.ts
packages/adt-plugin-abapgit/src/lib/filename/adt-uri-to-path.ts
packages/adt-plugin-abapgit/tests/filename/adt-uri-to-path.test.ts
```

## Out of scope

- SRVB (binding) — E12
- BDEF — E10

## Tests, Acceptance: same shape as E10.

## Devin prompt

```
Spec: /mnt/wsl/workspace/ubuntu/adt-cli/docs/roadmap/epics/e11-rap-srvd.md
Reads: AGENTS.md, docs/roadmap/README.md, e09-acds-parser.md.
Capture a real SRVD source from any S/4HANA sample app for reference.
Do NOT commit without approval.
```

## Status: Landed

- Contract: `client.adt.ddic.srvd.sources.*` at `/sap/bc/adt/ddic/srvd/sources`
  (GET/POST/PUT/DELETE + lock/unlock + source.main.get/put).
  Content-Type `application/vnd.sap.adt.ddic.srvd.v1+xml`, source is
  `.asrvd` text via `textPlain` Serializable<string>.
- Schema: `custom/srvdSource.xsd` extends `abapsource:AbapSourceMainObject`
  (mirrors `ddlSource.xsd`). Regenerated `@abapify/adt-schemas` types +
  `@abapify/adt-contracts` speci wrappers.
- ADK: `AdkServiceDefinition` (lightweight source-based object).
  Full lock/save/unlock flow via `ctx.lockService`.
- CLI: `adt srvd <create|read|write|activate|delete>` via
  `buildObjectCrudCommands`.
- MCP: `get_srvd`, `create_srvd`, `delete_srvd`; extended `create_object` /
  `delete_object` / `resolveObjectUriFromType` dispatch to include SRVD.
- abapGit handler: `zui_name.srvd.xml` (metadata) + `zui_name.srvd.asrvd`
  (source). SRVD added to abapgit plugin's XSD + codegen regenerated.
- Filename mapping: `adtUriToAbapGitPath()` extended for SRVD URIs
  (2 new test cases).
- Mock server: SRVD routes (GET/POST/PUT/DELETE + source passthrough).
- Fixtures: `ddic/srvd/single.xml` + `source.asrvd` (synthetic — no public
  S/4HANA SDK sample available; structure mirrors real Eclipse ADT
  envelope based on `ddlSource` + upstream `zcl_abapgit_object_srvd`).

Tests: +23 contract scenarios, +10 ADK, +4 abapgit handler, +2 filename,
+5 parity = **44 new tests**. Full green across adt-contracts, adk,
adt-plugin-abapgit, adt-schemas.

Follow-ups:

- Replace synthetic `single.xml` / `source.asrvd` fixtures with captures
  from a real S/4HANA system when one becomes available.
- abapGit SRVD XML layout needs verification against upstream
  `zcl_abapgit_object_srvd` when public clone available.
- Pre-existing typecheck noise (IncludesContract duplicate export +
  devc.model.ts objectReferences) remains — separate cleanup epic.

## Real-SAP verification (TRL 2025-11)

- `GET /sap/bc/adt/ddic/srvd/sources/<name>` — `UI_FLIGHT` and others
  return **HTTP 404** on TRL (object not present in this tenant's
  repository). No real fixture captured. Override via
  `ADT_REAL_SRVD_NAME=<NAME>` on a system that ships the target SRVD.
