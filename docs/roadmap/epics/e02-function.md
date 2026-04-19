# E02 — FUGR / FUNC CLI + MCP

## Mission

Add CLI commands and matching MCP tools for FUGR (function group) and FUNC (function module) lifecycle: create, read, change source, activate, delete — built on top of existing `client.adt.functions.groups.*` contract.

## Why

We already have:

- Contract surface (`client.adt.functions.groups.*` with FM source PUT via `textPlain` body).
- ADK partial: `packages/adk/src/objects/repository/fugr/func/func.model.ts` (4 unmigrated `client.fetch` sites — see follow-up).
- MCP read tools `get_function_group`, `get_function`.

What's missing:

- CLI commands for FUGR/FUNC CRUD.
- MCP write tools (`create_function_group`, `create_function`, `delete_function`, etc.).
- ADK migration of remaining 4 fetches in `func.model.ts` to typed contracts.
- abapGit-style filename mapping for FUGR includes — already handled by `adtUriToAbapGitPath` (E covered by coverage epic), validate.

This closes the FUGR gap noted in PR 103's parity matrix.

## Dependencies

- Blocked by: none (contract/ADK groundwork done).
- Blocks: nothing immediate; required for completeness of object CRUD.

## References

- sapcli CLI: `tmp/sapcli-ref/sapcli/sap/cli/function.py`
- sapcli ADT: `tmp/sapcli-ref/sapcli/sap/adt/function.py`
- Our contract: `packages/adt-contracts/src/adt/functions/{groups,fmodules}.ts`
- Our partial ADK: `packages/adk/src/objects/repository/fugr/{fugr.model.ts,func/func.model.ts}`
- Our MCP read tools: `packages/adt-mcp/src/lib/tools/function-tools.ts`
- File-mapping tests: `packages/adt-plugin-abapgit/tests/filename/adt-uri-to-path.test.ts` (FUGR includes already covered)

## Scope — files

### Add

```
packages/adt-cli/src/lib/commands/function/group.ts        # `adt function group <crud>` (create/read/change/activate/delete)
packages/adt-cli/src/lib/commands/function/module.ts       # `adt function module <crud>`
packages/adt-cli/src/lib/commands/function/index.ts
packages/adt-mcp/src/lib/tools/create-function-group.ts
packages/adt-mcp/src/lib/tools/create-function-module.ts
packages/adt-mcp/src/lib/tools/delete-function-module.ts
packages/adt-cli/tests/e2e/parity.function.test.ts         # 8-10 parity tests
packages/adt-fixtures/src/fixtures/functions/fmodule.xml   # if missing
packages/adt-fixtures/src/fixtures/functions/group-create-response.xml
```

### Modify

```
packages/adk/src/objects/repository/fugr/func/func.model.ts  # migrate 4 client.fetch sites to client.adt.functions.groups.fmodules.*
packages/adk/src/objects/repository/fugr/fugr.model.ts       # add create/save/delete via client.adt.functions.groups
packages/adk/tests/...                                        # update mocks if any
packages/adt-cli/src/lib/cli.ts                               # register `function` command
packages/adt-mcp/src/lib/tools/index.ts                       # register new tools
packages/adt-mcp/src/lib/tools/object-creation.ts             # FUGR + FUNC dispatch (FUGR already there partially)
packages/adt-mcp/src/lib/tools/delete-object.ts               # FUGR + FUNC dispatch
packages/adt-fixtures/src/fixtures/registry.ts
packages/adt-fixtures/src/mock-server/routes.ts               # extend FUGR routes for create/delete + FM CRUD if missing
```

## Out of scope

- BAdI implementations (E03).
- gCTS-related FUGR transport handling (E07).

## Tests

- ADK unit: 8 tests for AdkFunctionGroup + AdkFunctionModule (load/create/save/delete/lock/unlock + edge: FM inside non-existent group).
- Contract: validate fmodules contract with new fixtures.
- E2E parity: 10 tests — group/module × CRUD × CLI/MCP.

## Acceptance

```bash
bunx nx run-many -t build -p adt-contracts adk adt-cli adt-mcp adt-fixtures
bunx nx run-many -t test -p adt-contracts adk adt-cli adt-mcp
bunx nx typecheck && bunx nx lint && bunx nx format:write
```

Verify `grep -r ctx.client.fetch packages/adk/src/objects/repository/fugr` returns nothing after the migration.

## Devin prompt

```
Spec: /mnt/wsl/workspace/ubuntu/adt-cli/docs/roadmap/epics/e02-function.md

Read AGENTS.md, docs/roadmap/README.md, then this epic file. Implement Scope strictly.
Reference: /tmp/sapcli-ref/sapcli/sap/cli/function.py + sap/adt/function.py
Do NOT commit without explicit user approval.
```
