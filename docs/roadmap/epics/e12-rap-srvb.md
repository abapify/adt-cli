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
