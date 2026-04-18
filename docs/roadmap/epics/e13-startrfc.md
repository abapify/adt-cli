# E13 — startrfc (NW RFC transport)

## Mission

Add a `adt rfc` command + MCP tool that calls SAP RFC function modules over the SAP NetWeaver RFC protocol (NOT ADT). Supports importing parameters, exporting results, table parameters, exceptions.

## Why

ADT is HTTP REST, but huge swathes of SAP automation still rely on RFC (BAPI calls, custom FMs, system administration). Without an RFC transport, adt-cli can't drive RFC scenarios that ADT doesn't expose. sapcli has working `sap startrfc`.

## Dependencies

- Blocked by: none
- Blocks: nothing

## References

- sapcli: `tmp/sapcli-ref/sapcli/sap/cli/startrfc.py` + `sap/rfc/`
- Two implementation choices:
  1. Use `node-rfc` (https://github.com/SAP/node-rfc) — official SAP NW RFC SDK binding for Node. Native module; requires SAP NW RFC SDK installed locally. Best fidelity.
  2. Use SOAP-over-HTTP RFC (`/sap/bc/soap/rfc?...`) — REST/SOAP wrapper SAP exposes for some FMs. Doesn't require SDK but is limited.

Recommend: ship Option 2 first (universal, no native deps), keep Option 1 as opt-in plugin (`@abapify/adt-plugin-rfc-native`).

## Scope — files

### Add

```
packages/adt-rfc/                                          # NEW package (transport-level, not ADT)
├── package.json
├── project.json
├── tsconfig*.json
├── tsdown.config.ts
├── README.md
├── AGENTS.md
├── src/
│   ├── index.ts
│   ├── lib/
│   │   ├── transport/
│   │   │   ├── soap-rfc.ts      # SOAP-over-HTTP transport (default)
│   │   │   └── types.ts
│   │   └── client/rfc-client.ts # call(fmName, params)
└── tests/
    └── soap-rfc.test.ts
packages/adt-cli/src/lib/commands/rfc/index.ts            # `adt rfc <FM> --param key=value --param ...`
packages/adt-mcp/src/lib/tools/call-rfc.ts
packages/adt-cli/tests/e2e/parity.rfc.test.ts
```

### Modify

```
packages/adt-cli/src/lib/cli.ts
packages/adt-mcp/src/lib/tools/index.ts
packages/adt-fixtures/src/fixtures/rfc/{request,response}.xml
packages/adt-fixtures/src/mock-server/routes.ts            # mock /sap/bc/soap/rfc endpoint
```

## Out of scope

- node-rfc native SDK plugin — separate optional epic.
- BAPI-level helpers (transactional updates, commit work, etc.).

## Tests

- Unit: SOAP envelope build/parse round-trip.
- Parity: 4+ (call simple FM with importing params, table params, error response).

## Acceptance

```bash
bunx nx run-many -t build,test -p adt-rfc adt-cli adt-mcp adt-fixtures
bunx nx typecheck && bunx nx lint && bunx nx format:write
```

## Devin prompt

```
Spec: /mnt/wsl/workspace/ubuntu/adt-cli/docs/roadmap/epics/e13-startrfc.md
Reads: AGENTS.md, docs/roadmap/README.md.
Reference: /tmp/sapcli-ref/sapcli/sap/cli/startrfc.py and sap/rfc/.
Do NOT commit without approval.
```

## Open questions

- `/sap/bc/soap/rfc` may be disabled by default on customer systems. Document this; add `--auth basic|saml` and `--client` options up front.
- For the native plugin: is it worth shipping at all, or is HTTP/SOAP sufficient for adt-cli's automation use cases?
