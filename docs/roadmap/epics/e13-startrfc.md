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

## Implementation notes (Phase 1, SOAP-over-HTTP)

- **Package layout.** New leaf package `@abapify/adt-rfc` — zero workspace deps. `createRfcClient({ fetch })` takes any fetcher matching `AdtClient.fetch()` to avoid a circular graph with `@abapify/adt-client`.
- **Parser.** SAP's SOAP-RFC responses are simple enough that a hand-rolled tokenizer + stack (no `fast-xml-parser`) handles all cases: scalars, structures, and `<item>` tables (per-row structures).
- **CLI.** `adt rfc <FM> --param KEY=VALUE [--json '{"EXTRA":"…"}'] [-x raw|bapi] [--client 100]`.
- **MCP.** `call_rfc` tool with `functionModule` + free-form `parameters` object.
- **Mock server.** Extended `adt-fixtures` routes.ts with `POST /sap/bc/soap/rfc` returning a canned STFC_CONNECTION echo. Body is not parsed; the response always contains `ECHOTEXT=hello` which matches parity-test inputs.

### Real-SAP status (TRL, captured 2025)

`STFC_CONNECTION` via `/sap/bc/soap/rfc` returns **HTTP 403** on SAP BTP Trial (TRL). SOAP-RFC is disabled on that landscape. The real-e2e test (`tests/real-e2e/parity.e13-rfc.real.test.ts`) catches `RfcTransportUnavailable` and marks the case as a **documented skip**, keeping CI green while still exercising the transport + error classification.

New open questions:

- Which Trial / customer landscapes actually ship `/sap/bc/soap/rfc` enabled? If very few, prioritise the native `libsapnwrfc` plugin sooner.
- Should the CLI / MCP surface an explicit "SOAP-RFC disabled" diagnostic (separate exit code) so orchestration scripts can fall back automatically? — Currently uses exit code `2` (CLI) and `error: "TRANSPORT_UNAVAILABLE"` (MCP).
