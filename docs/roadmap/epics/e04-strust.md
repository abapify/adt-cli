# E04 — STRUST Certificate Management

## Mission

CLI + MCP for SAP STRUST PSE (Personal Security Environment) operations: list PSEs, list/import/export X.509 certs, refresh.

## Why

Cert rotation automation is a real ops need. sapcli has working `sap strust` command. Small, isolated; great example of a "non-CRUD" ADT surface.

## Dependencies

- Blocked by: none
- Blocks: nothing

## References

- sapcli: `tmp/sapcli-ref/sapcli/sap/cli/strust.py` + `sap/adt/strust.py`
- ADT endpoint: `/sap/bc/adt/system/security/pses` and friends
- sapcli fixtures: `tmp/sapcli-ref/sapcli/test/unit/fixtures_sap_adt_strust.py`

## Scope — files

### Add

```
packages/adt-schemas/.xsd/custom/strust.xsd                       # if missing
packages/adt-contracts/src/adt/system/security/pses.ts            # contract
packages/adt-contracts/tests/contracts/strust.test.ts
packages/adt-fixtures/src/fixtures/system/security/pse-list.xml
packages/adt-fixtures/src/fixtures/system/security/cert-list.xml
packages/adt-cli/src/lib/commands/strust/index.ts                 # `adt strust <list|put|get|delete>`
packages/adt-cli/src/lib/commands/strust/{list,put,get,delete}.ts
packages/adt-mcp/src/lib/tools/{list-pses,list-certs,upload-cert,delete-cert}.ts
packages/adt-cli/tests/e2e/parity.strust.test.ts
```

### Modify

```
packages/adt-contracts/src/adt/system/index.ts
packages/adt-cli/src/lib/cli.ts
packages/adt-mcp/src/lib/tools/index.ts
packages/adt-fixtures/src/fixtures/registry.ts
packages/adt-fixtures/src/mock-server/routes.ts
```

## Out of scope

- Cert generation (CSR creation) — read/write only.
- ICM/web dispatcher SSL config.

## Tests

- Contract: 4+
- Parity: 6+ (list PSEs, list certs, upload, delete, get details, refresh)

## Acceptance

```bash
bunx nx run-many -t build,test -p adt-contracts adt-cli adt-mcp adt-fixtures
bunx nx typecheck && bunx nx lint && bunx nx format:write
```

## Devin prompt

```
Spec: /mnt/wsl/workspace/ubuntu/adt-cli/docs/roadmap/epics/e04-strust.md
Read AGENTS.md + docs/roadmap/README.md. Reference: /tmp/sapcli-ref/sapcli/sap/cli/strust.py.
Do NOT commit without approval.
```

## Open questions (post-landing)

- sapcli drives STRUST via **RFC** (`sap/rfc/strust.py`), not ADT. There is no
  `sap/adt/strust.py` to reference. The ADT path `/sap/bc/adt/system/security/pses`
  used here follows the `/sap/bc/adt/system/...` convention (cf. `system/users`)
  but has **not been verified against a real SAP system**. All fixtures in
  `packages/adt-fixtures/src/fixtures/system/security/` are marked
  `TODO-synthetic` and must be replaced with real captures before this
  surface is promoted from "stub" to "production".
- Out-of-scope ops (CSR generation, PSE create/remove, ICM-notify) are
  intentionally not implemented — they correspond to `sap strust createpse`,
  `getcsr`, `removepse`, `createidentity`, which require RFC.
- Shape of `uploadCertificate` response was assumed to be the same atom
  cert-list feed — SAP may return an empty 204 instead. Verify when a real
  ADT capture becomes available.
- `deleteCertificate` path uses a 1-based numeric index for `{id}`; some
  SAP versions key by serial number or subject. Revisit when capture is
  available.
