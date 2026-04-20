# Add Streamable HTTP transport + stateful sessions to `@abapify/adt-mcp`

## Why

`@abapify/adt-mcp` today only speaks **MCP over stdio** and is explicitly a
"stateless server — connection-per-call" (see invariant #4 in
`packages/adt-mcp/AGENTS.md`). That constrains the product in two ways:

1. **Deployment** — stdio requires the MCP client to spawn the server as a
   local subprocess. This rules out Amazon Q Developer, Kiro, Docker-based
   tenants, cloud hosting, shared/team deployments, and any scenario where
   the MCP client lives on a different machine from the ABAP backend
   connectivity. The competitive "AWS ABAP Accelerator" product already
   ships Streamable HTTP; PR [#110](https://github.com/abapify/adt-cli/pull/110)
   documents the gap and tracks it as Phase 1 / critical.
2. **Performance and ergonomics** — every tool call today repeats the
   full SAP security-session + CSRF handshake (3 round trips, ~100–300 ms
   overhead), and every tool must accept `baseUrl/username/password/client`
   arguments. Credentials leak into every tool invocation, and the chatty
   handshake burns the SAP-enforced "1 security session per user" budget.

This change adds a second transport — **Streamable HTTP with stateful MCP
sessions** — while keeping stdio fully backward-compatible. An MCP session
becomes a unit-of-work: it owns the cached `AdtClient` (so the SAP
handshake happens once), an active lock registry, and an optional
transactional changeset. On top of that we add a **two-layer auth model**
(MCP-layer bearer / OIDC protecting the HTTP endpoint; SAP credentials
supplied once per session via a dedicated `sap_connect` handshake tool)
and **multi-system routing** so a single MCP server can front several SAP
systems selected by `systemId`.

## What Changes

### New transport

- **Streamable HTTP** via `StreamableHTTPServerTransport` from the already
  installed `@modelcontextprotocol/sdk` (v^1.27). SSE (the legacy MCP HTTP
  transport) is **not** implemented.
- `sessionIdGenerator: randomUUID` — every session gets a UUID returned
  as `Mcp-Session-Id`. Clients echo the header on every subsequent
  request.
- stdio transport continues to work unchanged; it is selected by the
  absence of `--http` / `MCP_HTTP_PORT`.

### New session model

Each HTTP MCP session owns:

- A cached `AdtClient` (one SAP security session per MCP session).
- A **lock registry** — all object locks acquired through that session,
  so we can release them on session close (SAP limits 1 security session
  per user, so a leak is catastrophic).
- An optional **active changeset** — a batch of pending ADT operations
  (activations, creates, updates) to be committed or rolled back
  atomically via new `sap_commit_changeset` / `sap_rollback_changeset`
  tools.

### Two-layer authentication

| Layer             | Protects            | v1 mechanism                                                                                                                           | v2 mechanism                |
| ----------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| MCP HTTP endpoint | Who may talk to MCP | `MCP_AUTH_TOKEN` bearer (constant-time compare); optional `TRUST_FORWARDED_AUTH` reverse-proxy mode                                    | Okta / OIDC bearer (Wave 4) |
| SAP session       | Which ABAP user     | `sap_connect({ baseUrl, username, password, client })` handshake tool, or `sap_connect({ systemId })` resolved from server-side config | Same                        |

Credentials are never persisted to disk. The SAP session dies with the
MCP session.

### Multi-system routing

- `~/.adt/systems.yaml` and/or `SAP_SYSTEMS` env var provide a named
  system registry (reusing `@abapify/adt-config` where possible).
- Resolution priority: `sap_connect` tool argument → HTTP header
  `x-sap-system-id` → server-default from env/config.
- Enables a single hosted MCP to front DEV / TEST / PROD without the
  client ever learning credentials.

### New tools

| Tool                     | Purpose                                                         |
| ------------------------ | --------------------------------------------------------------- |
| `sap_connect`            | Establish SAP session for this MCP session                      |
| `sap_disconnect`         | Tear down SAP session early (also happens on MCP session close) |
| `sap_list_systems`       | Enumerate configured systems (names only, no creds)             |
| `sap_begin_changeset`    | Start a transactional batch in this session                     |
| `sap_add_to_changeset`   | Add an operation (lock+update+activate) to the active batch     |
| `sap_commit_changeset`   | Apply all operations, release all locks, close the changeset    |
| `sap_rollback_changeset` | Discard pending operations, release all locks                   |

All changeset logic lives in a new **`ChangesetService`** in
`@abapify/adt-cli` so that the CLI ↔ MCP parity invariant holds
(every MCP tool has a matching CLI subcommand and both hit the same
service; see root `AGENTS.md` _MCP ↔ CLI Coupling_).

### Deployment artefacts

- `packages/adt-mcp/Dockerfile.mcp` — distroless Node image, configured
  for JFrog registry via `BUN_CONFIG_REGISTRY` build arg.
- `packages/adt-mcp/docker-compose.yml` — local reference deployment
  (reverse proxy + MCP server).
- Updated `packages/adt-mcp/README.md` with HTTP / auth / multi-system
  / changeset / Docker sections.

## Affected packages

- **touched** `packages/adt-mcp/` — transport selection, session
  registry, `sap_connect` family, changeset tools, HTTP server,
  auth middleware, mock-server HTTP mode, integration tests.
- **touched** `packages/adt-cli/` — new `ChangesetService` exported
  from `src/index.ts`; matching `adt changeset …` subcommands; parity
  tests under `tests/e2e/parity.changeset.test.ts`.
- **touched** `packages/adt-config/` — typed multi-system registry
  (`systems.yaml` shape + env override).
- **touched** `packages/adt-client/` — no API changes expected; may
  need minor plumbing so the same `AdtClient` instance survives
  multiple tool calls without re-handshaking.
- **touched** root `AGENTS.md` — update the MCP ↔ CLI Coupling section
  to mention HTTP transport and changeset parity.

## Architectural impact

```
MCP client ──HTTP/stdio──►  adt-mcp
                                │
                                ├─ SessionRegistry (HTTP only)
                                │    └─ { AdtClient, LockRegistry, Changeset? }
                                │
                                └─ ToolContext.getClient(args)
                                     │
                                     └─► @abapify/adt-cli services
                                           └─► @abapify/adt-client
                                                 └─► SAP ADT
```

No dependency-graph changes. `adt-mcp → adt-cli → adt-client` direction
is preserved; no new cycles. The parity invariant is strengthened: every
new CLI subcommand added in this change ships with a matching MCP tool
and a parity test exercising both through the shared mock.

## Non-goals (v1)

- **X.509 principal propagation** (AWS Accelerator Phase 6). Deferred
  indefinitely; BTP Steampunk uses a different auth model.
- **Cloud secret managers** (AWS Secrets Manager, Azure Key Vault,
  Vault). `MCP_AUTH_TOKEN` + reverse-proxy + env vars are sufficient
  for v1.
- **Interactive TTY credential prompts inside Docker** — creds come
  from `sap_connect` arguments, headers, or server-side config.
- **Rate limiting, RBAC, audit logging** — operational concerns for
  later waves once the transport is stable.
- **Legacy SSE transport** — superseded by Streamable HTTP in the MCP
  spec; not worth implementing.

## Testing

- **Unit** — new `SessionRegistry`, `SystemRegistry`, auth middleware,
  and changeset state machine get Vitest coverage in `packages/adt-mcp`.
- **Integration** — existing `tests/integration.test.ts` is extended
  with an HTTP transport path that drives the same mock server through
  a real HTTP client. Tests cover session creation, reuse, expiry,
  lock cleanup on drop, and changeset commit/rollback.
- **Parity** — new `packages/adt-cli/tests/e2e/parity.changeset.test.ts`
  asserts that `adt changeset …` and `sap_*_changeset` MCP tools hit
  the same `ChangesetService` and produce equivalent results.
- **Security** — tests for missing/invalid `MCP_AUTH_TOKEN`,
  `x-forwarded-user` handling under `TRUST_FORWARDED_AUTH`, and
  host-header validation.

## Rollback

Additive. Reverting this change removes HTTP transport and the
changeset tools; stdio behaviour reverts to today's connection-per-call
semantics with no external impact. The `ChangesetService` in
`@abapify/adt-cli` is new and has no existing callers, so removing it
is safe.
