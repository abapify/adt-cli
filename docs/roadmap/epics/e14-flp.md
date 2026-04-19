# E14 — Fiori Launchpad (FLP)

## Mission

CLI + MCP for Fiori Launchpad inventory: list catalogs, list groups, list tiles, read tile metadata, optional create/delete.

## Why

FLP is the user-facing layer of S/4HANA UI. Customers and consultants need scriptable access to catalog/tile inventory for migration, audit, automation. sapcli has working `sap flp`.

## Dependencies

- Blocked by: none
- Blocks: nothing

## References

- sapcli: `tmp/sapcli-ref/sapcli/sap/cli/flp.py` + `sap/adt/flp.py`
- ADT endpoint: `/sap/bc/adt/uifsa/...` (check sapcli for exact paths)

## Scope — files

### Add

```
packages/adt-schemas/.xsd/custom/flp*.xsd                  # if missing
packages/adt-contracts/src/adt/uifsa/{catalogs,groups,tiles}.ts
packages/adt-contracts/src/adt/uifsa/index.ts
packages/adt-contracts/tests/contracts/flp.test.ts
packages/adt-fixtures/src/fixtures/flp/{catalog-list,group-list,tile}.xml
packages/adt-cli/src/lib/commands/flp/{list-catalogs,list-tiles,get-tile}.ts
packages/adt-cli/src/lib/commands/flp/index.ts
packages/adt-mcp/src/lib/tools/{list-flp-catalogs,list-flp-tiles,get-flp-tile}.ts
packages/adt-cli/tests/e2e/parity.flp.test.ts
```

### Modify

```
packages/adt-contracts/src/adt/index.ts
packages/adt-cli/src/lib/cli.ts
packages/adt-mcp/src/lib/tools/index.ts
packages/adt-fixtures/src/fixtures/registry.ts
packages/adt-fixtures/src/mock-server/routes.ts
```

## Out of scope

- Tile creation/deletion in v1; read-only is enough to start. Add later if demand exists.

## Tests

- Contract: 5+
- Parity: 5+ (list catalogs, list tiles in catalog, get tile metadata)

## Acceptance: standard.

## Devin prompt

```
Spec: /mnt/wsl/workspace/ubuntu/adt-cli/docs/roadmap/epics/e14-flp.md
Reference: /tmp/sapcli-ref/sapcli/sap/cli/flp.py.
Do NOT commit without approval.
```
