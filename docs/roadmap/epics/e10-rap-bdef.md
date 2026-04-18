# E10 — RAP: Behavior Definition (BDEF)

## Mission

Add CRUD support for BDEF (Behavior Definition) objects: read source (`.abdl`), parse, modify, write back, activate. CLI + MCP + AdkBDef + contract.

## Why

BDEF is the heart of RAP (RESTful ABAP Programming model) — without it, modern S/4HANA development is unsupported. sapcli has `sap behaviordefinition`. We have nothing.

## Dependencies

- Blocked by: **E09** (acds parser — BDEF reuses the CDS-style grammar and references CDS entities)
- Blocks: nothing

## References

- sapcli: `tmp/sapcli-ref/sapcli/sap/cli/behaviordefinition.py` + `sap/adt/behaviordefinition.py`
- BDEF endpoint: `/sap/bc/adt/bo/behaviordefinitions/{name}` (`.abdl` source)
- ADT XSD: capture from system; otherwise custom XSD wrapping `<abapBehaviorDefinition>` root.
- abapGit handler reference: search `abapGit/src/objects/zcl_abapgit_object_bdef.clas.abap`.

## Scope — files

### Add

```
packages/adt-schemas/.xsd/custom/bdef.xsd                       # if no SAP XSD available
packages/adt-contracts/src/adt/bo/behaviordefinitions.ts        # crud() with sources: ['main'] (.abdl text)
packages/adt-contracts/src/adt/bo/index.ts
packages/adt-contracts/tests/contracts/bdef.test.ts
packages/adt-fixtures/src/fixtures/bo/bdef/{single.xml,source.abdl}
packages/adk/src/objects/repository/bdef/bdef.model.ts
packages/adk/tests/bdef.test.ts
packages/adt-cli/src/lib/commands/bdef/index.ts                  # `adt bdef <crud>`
packages/adt-mcp/src/lib/tools/{get-bdef,create-bdef,delete-bdef}.ts
packages/adt-cli/tests/e2e/parity.bdef.test.ts
```

### Modify

```
packages/adt-contracts/src/adt/index.ts                          # register bo namespace
packages/adt-cli/src/lib/cli.ts
packages/adt-mcp/src/lib/tools/index.ts
packages/adt-mcp/src/lib/tools/object-creation.ts                # BDEF dispatch (use AdkBDef if possible)
packages/adt-mcp/src/lib/tools/delete-object.ts                  # BDEF dispatch
packages/adt-fixtures/src/fixtures/registry.ts
packages/adt-fixtures/src/mock-server/routes.ts                  # /sap/bc/adt/bo/behaviordefinitions/...
packages/adt-plugin-abapgit/src/lib/handlers/objects/bdef.ts     # abapGit handler (file: zcl_foo.bdef.abdl + .bdef.xml)
packages/adt-plugin-abapgit/src/lib/handlers/index.ts            # register
packages/adt-plugin-abapgit/src/lib/filename/adt-uri-to-path.ts  # add BDEF mapping
packages/adt-plugin-abapgit/tests/filename/adt-uri-to-path.test.ts
```

## Out of scope

- BDEF semantic validation (action signatures match CDS, etc.) — leave to E11 if ever needed.
- Service definition (SRVD) and binding (SRVB) — separate epics E11/E12.

## Tests

- Contract: 5+
- Parity: 5+ (read source, create, write source, activate, delete)
- abapGit handler: 4+ (serialize, deserialize, file naming, roundtrip)

## Acceptance

```bash
bunx nx run-many -t build,test -p adt-contracts adk adt-cli adt-mcp adt-plugin-abapgit
bunx nx typecheck && bunx nx lint && bunx nx format:write
```

## Devin prompt

```
Spec: /mnt/wsl/workspace/ubuntu/adt-cli/docs/roadmap/epics/e10-rap-bdef.md
Reads: AGENTS.md, docs/roadmap/README.md, e09-acds-parser.md, packages/adk/AGENTS.md.
Reference: /tmp/sapcli-ref/sapcli/sap/cli/behaviordefinition.py.
Do NOT commit without approval.
```
