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
