# E03 — BAdI Implementations

## Mission

CLI + MCP support for BAdI (Business Add-In) implementations: list, create, change, delete, activate.

## Why

BAdIs are SAP's core enhancement framework. sapcli ships a working `sap badi` command. We have no surface today.

## Dependencies

- Blocked by: none
- Blocks: nothing

## References

- sapcli: `tmp/sapcli-ref/sapcli/sap/cli/badi.py` + `sap/adt/badi.py`
- ADT endpoint: `/sap/bc/adt/oo/classes/{name}/methodimplementations` (BAdI implementations live inside enhancement implementations / classes)
- Real shape: capture from a system or copy sapcli test fixtures (`test/unit/fixtures_adt_badi.py` if present, else `fixtures_sap_adt_badi.py`).

## Scope — files

### Add

```
packages/adt-schemas/.xsd/custom/badi.xsd                 # if no SAP XSD
packages/adt-contracts/src/adt/oo/badi/index.ts           # contract for BAdI impl endpoints
packages/adt-contracts/tests/contracts/badi.test.ts
packages/adt-fixtures/src/fixtures/oo/badi/*.xml
packages/adk/src/objects/repository/badi/badi.model.ts
packages/adk/tests/badi.test.ts
packages/adt-cli/src/lib/commands/badi/index.ts           # `adt badi <crud>`
packages/adt-mcp/src/lib/tools/{get-badi,create-badi,delete-badi}.ts
packages/adt-cli/tests/e2e/parity.badi.test.ts
```

### Modify

```
packages/adt-contracts/src/adt/oo/index.ts
packages/adt-cli/src/lib/cli.ts
packages/adt-mcp/src/lib/tools/index.ts
packages/adt-fixtures/src/fixtures/registry.ts
packages/adt-fixtures/src/mock-server/routes.ts
```

## Out of scope

- BAdI definitions (separate object type — defer to a future epic if needed).
- Enhancement spots / classes — only impls.

## Tests

- Contract: 4+
- ADK unit: 6+
- Parity: 5+ (CRUD + activate)

## Acceptance

```bash
bunx nx run-many -t build,test -p adt-contracts adk adt-cli adt-mcp adt-fixtures
bunx nx typecheck && bunx nx lint && bunx nx format:write
```

## Devin prompt

```
Spec: /mnt/wsl/workspace/ubuntu/adt-cli/docs/roadmap/epics/e03-badi.md
Read AGENTS.md + docs/roadmap/README.md first. Reference: /tmp/sapcli-ref/sapcli/sap/cli/badi.py.
Do NOT commit without approval.
```
