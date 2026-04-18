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

## Delivered (2025-PR-103)

- **Contract**: `packages/adt-contracts/src/adt/bo/behaviordefinitions.ts` — reuses the existing `blueSource` wrapper schema (namespace `http://www.sap.com/wbobj/blue`) that SAP serves for BDEF/TABL/STRUCT metadata; no new XSD in adt-schemas. `crud()` helper with `sources: ['main']` wires up `.abdl` source GET/PUT via the `textPlain` helper.
- **ADK**: lightweight `AdkBehaviorDefinition` class (same pattern as `AdkDdlSource`) with static `kind = 'BehaviorDefinition'`, `objectUri`, `getSource/saveMainSource`, `lock/unlock` (via `ctx.lockService`), `activate`, `create/delete` factories.
- **CLI**: `adt bdef <create|read|write|activate|delete>` via `buildObjectCrudCommands`.
- **MCP**: dedicated `get_bdef`, `create_bdef`, `delete_bdef` tools **plus** BDEF dispatch added to generic `create_object`, `delete_object`, `resolveObjectUriFromType`, and `SOURCE_BACKED_OBJECT_TYPES` so `update_source` and `activate_object` work for BDEF.
- **abapGit handler**: `packages/adt-plugin-abapgit/src/lib/handlers/objects/bdef.ts` with custom `serialize` producing `<name>.bdef.abdl` + `<name>.bdef.xml` (minimal `SKEY` metadata block, mirrors abapGit's `zcl_abapgit_object_bdef` serializer shape).
- **Filename mapping**: `adtUriToAbapGitPath` now returns `src/<name>.bdef.abdl` for `/sap/bc/adt/bo/behaviordefinitions/<name>(/source/main)?`.
- **Fixtures & mock**: `fixtures.bo.bdef.single` + `.source` preloaded into the mock ADT server; routes cover GET/POST/PUT/DELETE and `?_action=LOCK` (lock POSTs are delegated to the generic lock handler by excluding `_action=` from the BDEF POST route).
- **Tests**:
  - Contract: 6 operations × ~4 assertions = 23 cases in `tests/contracts/bdef.test.ts`
  - Parity: 5 CLI+MCP operations in `tests/e2e/parity.bdef.test.ts`
  - ADK unit: 10 cases in `packages/adk/tests/bdef.test.ts`
  - abapGit handler: 4 cases in `packages/adt-plugin-abapgit/tests/handlers/bdef.test.ts`
  - Filename mapping: +2 cases in `adt-uri-to-path.test.ts`

## Open questions (follow-ups)

- **SAP XSD for BDEF**: no official XSD is shipped; the real `.abdl` grammar is documented separately in SAP help. The `blueSource` wrapper covers only the ADT metadata envelope — the `.abdl` body is plain text. If deeper parsing is needed (action/entity symbol resolution), wire in `@abapify/acds` or a dedicated BDEF grammar. Out of scope for E10.
- **Semantic validation** (action signatures vs CDS behavior projection) is explicitly out of scope per the epic; may become relevant once SRVD lands (E11) and full RAP round-trip tests are written.
- **CTS stale lock behaviour on BTP**: same caveat as other source-based objects — a delete + immediate re-create may fail until the system-level lock clears (~15–30 min). The parity tests avoid hitting this path by using distinct object names for create/delete.
- **abapGit BDEF xml layout**: the exact SKEY/DESCR layout emitted by `zcl_abapgit_object_bdef` was not available at implementation time (no public abapGit clone in the sandbox). The minimal `SKEY { TYPE, NAME }` shape implemented here matches the pattern used by other source-only handlers and round-trips cleanly; if upstream abapGit differs, adjust the XSD + handler together.
