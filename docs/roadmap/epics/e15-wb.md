# E15 — Workbench navigation (`adt wb`)

## Mission

Add a `adt wb` command + matching MCP tools providing workbench-style operations: where-used, navigate-to-definition, object-info, refactor previews. Distinct from generic `search` / `get` because semantics are workbench-aware (e.g. "where is method X called from?", not just "is there a string match?").

## Why

Where-used and call-hierarchy are essential developer workflows. We have the building blocks — MCP exposes `find_references`, `get_callers_of`, `get_callees_of`, `find_definition` — but no CLI surface. sapcli has `sap wb`. Bringing it to CLI completes parity.

## Dependencies

- Blocked by: none
- Blocks: nothing

## References

- sapcli: `tmp/sapcli-ref/sapcli/sap/cli/wb.py`
- Existing MCP tools: `packages/adt-mcp/src/lib/tools/{find-definition,find-references,call-hierarchy}.ts`
- ADT endpoints (already wired in mock):
  - `/sap/bc/adt/repository/informationsystem/usageReferences`
  - `/sap/bc/adt/abapsource/callers`
  - `/sap/bc/adt/abapsource/callees`
  - `/sap/bc/adt/navigation/target`

## Scope — files

### Add

```
packages/adt-cli/src/lib/commands/wb/
├── where-used.ts          # `adt wb where-used <object>`
├── callers.ts             # `adt wb callers <object> <method>`
├── callees.ts             # `adt wb callees <object> <method>`
├── definition.ts          # `adt wb definition <reference>`
├── outline.ts             # `adt wb outline <object>` (replaces empty packages/adt-cli/src/lib/commands/outline.ts)
└── index.ts
packages/adt-cli/tests/e2e/parity.wb.test.ts
```

### Modify

```
packages/adt-cli/src/lib/cli.ts
packages/adt-cli/src/lib/commands/outline.ts          # delete (now under wb/outline.ts)
```

(MCP side already exists. No changes needed there beyond verifying parity in tests.)

## Out of scope

- New ADT endpoints — reuse what's wired.
- IDE-style highlighting / coverage — out of CLI scope.

## Tests

- Parity: 5+ (where-used, callers, callees, definition, outline) — CLI vs existing MCP tool.

## Acceptance

```bash
bunx nx run-many -t build,test -p adt-cli adt-mcp
bunx nx typecheck && bunx nx lint && bunx nx format:write
```

## Devin prompt

```
Spec: /mnt/wsl/workspace/ubuntu/adt-cli/docs/roadmap/epics/e15-wb.md
Reference: /tmp/sapcli-ref/sapcli/sap/cli/wb.py and our existing MCP tools.
Do NOT commit without approval.
```
