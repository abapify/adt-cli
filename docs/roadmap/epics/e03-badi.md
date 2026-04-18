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

## Implementation notes (first pass)

First-pass implementation delivered:

- Custom XSD at `packages/adt-schemas/.xsd/custom/badi.xsd` modelling the
  `enh:enhancementImplementation` wrapper as an `adtcore:AdtMainObject`
  extension — same lightweight pattern used by `blueSource` for BDEF.
- CRUD + lock/unlock + `/source/main` contract at
  `packages/adt-contracts/src/adt/enhancements/enhoxhh.ts`.
- `AdkBadi` ADK model paralleling `AdkBehaviorDefinition`.
- CLI: `adt badi {create|read|write|activate|delete}` via
  `buildObjectCrudCommands`.
- MCP tools: `get_badi`, `create_badi`, `delete_badi`.
- 23 contract tests + 13 ADK unit tests + 5 CLI/MCP parity tests.
- Real-e2e probe added under `tests/real-e2e/parity.e03-badi.real.test.ts`
  — passes against SAP BTP Trial (TRL) by asserting the documented 403
  on the `/sap/bc/adt/enhancements/...` namespace.

## Open questions

1. **Endpoint access on Trial.** BTP Trial denies all `/enhancements/*`
   calls with HTTP 403 ("No authorization"). We could not capture a
   real ENHO fixture; `enhancements/enhoxhh/single.xml` remains
   TODO-synthetic. When a system with enhancement authorisation
   becomes available, re-run
   `npx vitest run tests/real-e2e/parity.e03-badi.real.test.ts`
   after setting `ADT_BADI_REAL_NAME=<impl>` to auto-capture the
   fixture into `packages/adt-fixtures/src/fixtures/enhancements/enhoxhh/real.xml`.

2. **Source payload shape.** The full BAdI impl tree lives in the
   `/source/main` payload which the XSD (`enhancements.xsd`) models as
   a base64-encoded `enh:sourceCodePlugin`. Our current
   `saveMainSource` treats it as plain text (`text/plain`). This
   matches how sapcli drives source writes but may need a structured
   variant (`set-active` style) when we implement BAdI activation
   toggling. Deferred until a real response can be inspected.

3. **sapcli surface parity.** sapcli's `sap badi list -i <enho>` and
   `sap badi set-active` operate on sub-entries inside an ENHO. Our
   first pass exposes the parent ENHO lifecycle only; a second-pass
   `adt badi list <enho>` that parses the source payload to enumerate
   individual BAdI implementations is tracked as a follow-up.

4. **Activation semantics.** `AdkBadi.activate()` posts to the generic
   `/sap/bc/adt/activation` endpoint with the ENHO URI. Confirmed via
   unit tests; not confirmed against a real system because of the 403.
