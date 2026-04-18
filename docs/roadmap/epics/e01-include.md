# E01 — INCL CLI + MCP

## Mission

Add full CRUD support for ABAP `INCL` (include) objects in CLI and MCP, mirroring the existing PROG/CLAS/INTF surface.

## Why

Includes are used heavily in legacy ABAP and FUGR-adjacent code. sapcli ships `sap include create/read/change/delete/activate`. We have a contract path through `client.adt.programs.programs.*` that handles `R3TR PROG`, but no dedicated INCL path. Filling this closes a long-standing CLI surface gap and feeds Sonar/abapGit roundtrip flows.

## Dependencies

- Blocked by: none
- Blocks: nothing

## References

- sapcli CLI: `tmp/sapcli-ref/sapcli/sap/cli/include.py`
- sapcli ADT: `tmp/sapcli-ref/sapcli/sap/adt/programs.py` (Include class)
- sapcli tests: `tmp/sapcli-ref/sapcli/test/unit/test_sap_cli_include.py`
- Our existing pattern: `packages/adt-cli/src/lib/commands/object/program.ts` + `packages/adk/src/objects/repository/prog/prog.model.ts`
- ADT endpoint: `/sap/bc/adt/programs/includes/{name}` (and `.../source/main`)

## Scope — files

### Add

```
packages/adt-contracts/src/adt/programs/includes.ts        # crud() helper, mirrors programs.ts
packages/adt-contracts/tests/contracts/includes.test.ts    # ContractScenario
packages/adt-fixtures/src/fixtures/programs/include.xml    # real fixture (capture or copy from sapcli)
packages/adk/src/objects/repository/incl/incl.model.ts     # AdkInclude wrapping client.adt.programs.includes
packages/adk/src/objects/repository/incl/index.ts
packages/adk/tests/incl.test.ts                            # mock-based unit
packages/adt-cli/src/lib/commands/object/include.ts        # uses buildObjectCrudCommands(AdkInclude)
packages/adt-mcp/src/lib/tools/get-include.ts              # parity with get_class
packages/adt-cli/tests/e2e/parity.include.test.ts          # CLI+MCP parity (read/create/write/activate/delete)
```

### Modify

```
packages/adt-contracts/src/adt/programs/index.ts           # register includes contract
packages/adt-contracts/src/generated/schemas.ts            # regenerate after schemas: bunx tsx scripts/generate-schemas.ts
packages/adk/src/objects/repository/index.ts               # export AdkInclude
packages/adt-cli/src/lib/cli.ts                            # register include command
packages/adt-cli/src/lib/commands/object/index.ts
packages/adt-mcp/src/lib/tools/index.ts                    # register get_include
packages/adt-mcp/src/lib/tools/object-creation.ts          # add INCL to CREATE_OBJECT_TYPES dispatch
packages/adt-mcp/src/lib/tools/delete-object.ts            # INCL dispatch
packages/adt-fixtures/src/fixtures/registry.ts             # programs.include
packages/adt-fixtures/src/mock-server/routes.ts            # GET/POST/PUT/DELETE /sap/bc/adt/programs/includes/...
```

## Out of scope

- Function-group internal includes (those are E02).
- abapGit serialization for INCL — the existing `adt-plugin-abapgit` PROG handler should already handle them (verify, do not extend).

## Tests

- Unit (adk): 6+ tests for AdkInclude (load/create/save/delete/lock/unlock).
- Contract: 5+ scenarios (get, post, put, delete, source.main get/put).
- E2E parity (`parity.include.test.ts`): 5 tests — read, create, write source, activate, delete (CLI+MCP for each).

## Acceptance

```bash
bunx nx run-many -t build -p adt-contracts adk adt-cli adt-mcp adt-fixtures
bunx nx run-many -t test -p adt-contracts adk adt-cli adt-mcp adt-plugin-abapgit
bunx nx typecheck
bunx nx lint
bunx nx format:write
```

## Devin prompt

```
Repo: github.com/abapify/adt-cli, branch pr-103 (or new feat/e01-include branch).

Spec: /mnt/wsl/workspace/ubuntu/adt-cli/docs/roadmap/epics/e01-include.md

Read AGENTS.md, docs/roadmap/README.md, then this epic file. Implement Scope strictly.
Reference impl at /tmp/sapcli-ref/sapcli/ (clone if missing).
Do NOT commit without explicit user approval.
Run the Acceptance block before declaring done.
```
