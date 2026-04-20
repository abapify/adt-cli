# Design — `add-mcp-http-transport`

## Context

See `proposal.md` for motivation. This document captures the architectural
decisions, alternatives considered, and request/lifecycle diagrams that
guide implementation.

## Transport selection

```
┌─────────────┐         ┌──────────────────────────────┐
│ MCP client  │────────►│ adt-mcp entry-point (bin/*)  │
└─────────────┘         │                              │
                        │  if (MCP_HTTP_PORT || --http)│
                        │    → StreamableHTTPTransport │
                        │  else                        │
                        │    → StdioServerTransport    │
                        └──────────────┬───────────────┘
                                       │
                                       ▼
                              ┌────────────────┐
                              │ createMcpServer│ (unchanged factory)
                              └────────┬───────┘
                                       │ ToolContext
                                       ▼
                              ┌────────────────┐
                              │ registerTools  │
                              └────────────────┘
```

Both transports share the **same** `createMcpServer()` factory and the
**same** tool set. The transport layer only changes:

1. How incoming requests are framed (stdio frames vs HTTP POST/GET/DELETE
   on `/mcp`).
2. How the `ToolContext.getClient(args)` resolves an `AdtClient` — either
   a fresh per-call client (stdio, legacy) or a session-cached client
   (HTTP, or stdio after `sap_connect`).

### Decision: Streamable HTTP, not SSE

The MCP spec has superseded the legacy SSE transport with Streamable HTTP
(POST for JSON-RPC requests, GET for server-initiated streaming, DELETE
for explicit session close). `@modelcontextprotocol/sdk` ships
`StreamableHTTPServerTransport` ready to use. SSE is deprecated and not
worth maintaining.

### Decision: `sessionIdGenerator: randomUUID`

Alternatives considered:

- `sessionIdGenerator: undefined` (SDK-stateless mode). Rejected — kills
  the cached `AdtClient` benefit and forces every tool to carry
  credentials again.
- Deterministic IDs (e.g. hash of user + baseUrl). Rejected — trivially
  guessable, enables session hijacking.

`randomUUID` is collision-safe, unguessable, and returned to the client
as `Mcp-Session-Id`. Clients echo it on every subsequent request.

## Session lifecycle

```
client                         adt-mcp                         SAP
  │                              │                              │
  │ POST /mcp (initialize)       │                              │
  │─────────────────────────────►│                              │
  │                              │ create session record        │
  │ 200 + Mcp-Session-Id: UUID   │                              │
  │◄─────────────────────────────│                              │
  │                              │                              │
  │ POST /mcp (sap_connect)      │                              │
  │─────────────────────────────►│                              │
  │                              │ CSRF 3-step handshake       │
  │                              │─────────────────────────────►│
  │                              │◄─────────────────────────────│
  │                              │ cache AdtClient              │
  │ 200 { connected: true, ... } │                              │
  │◄─────────────────────────────│                              │
  │                              │                              │
  │ POST /mcp (any tool)         │                              │
  │─────────────────────────────►│                              │
  │                              │ reuse cached AdtClient       │
  │                              │─────────────────────────────►│  (no re-handshake)
  │                              │◄─────────────────────────────│
  │ 200 { ...result }            │                              │
  │◄─────────────────────────────│                              │
  │                              │                              │
  │ DELETE /mcp                  │                              │
  │─────────────────────────────►│                              │
  │                              │ release locks, close SAP ses │
  │                              │─────────────────────────────►│
  │                              │◄─────────────────────────────│
  │ 204                          │                              │
  │◄─────────────────────────────│                              │
```

### Session record shape

```typescript
interface McpSession {
  id: string; // UUID from randomUUID()
  mcpServer: McpServer; // per-session MCP server instance
  transport: StreamableHTTPServerTransport;
  adtClient?: AdtClient; // populated by sap_connect
  systemId?: string; // resolved system alias, if any
  locks: Map<string, LockHandle>; // objectUri → handle
  changeset?: Changeset; // optional active transactional batch
  lastActivityAt: number; // for idle-TTL cleanup
}
```

One `McpServer` + one transport **per session** is the SDK-recommended
pattern for Streamable HTTP in stateful mode; it lets the SDK correlate
server-initiated notifications back to the correct client without
cross-session leakage.

### Cleanup

Three cleanup paths:

1. **Explicit** — `DELETE /mcp` with matching `Mcp-Session-Id`.
2. **Tool-driven** — `sap_disconnect` clears the cached `AdtClient` but
   keeps the MCP session alive.
3. **Idle TTL** — background sweeper closes sessions whose
   `lastActivityAt` is older than `MCP_SESSION_IDLE_MS` (default 15
   minutes).

All three paths run the same `closeSession(id)` routine: release every
lock in `session.locks`, `DELETE` the SAP security session,
`transport.close()`, remove the map entry. Lock release is best-effort
but every failure is logged — a leaked lock is user-visible damage.

## Two-layer auth

### Layer 1 — MCP HTTP endpoint

Middleware chain applied before the MCP transport:

```
  hostHeaderValidation  (SDK-provided, allow-list from MCP_ALLOWED_HOSTS)
        │
  corsMiddleware        (allow-list from MCP_ALLOWED_ORIGINS)
        │
  authMiddleware        (one of:)
        │                 - bearer    : timingSafeEqual(req header, MCP_AUTH_TOKEN)
        │                 - forwarded : require x-forwarded-user when TRUST_FORWARDED_AUTH=1
        │                 - oidc      : JWT verify via jose, issuer=MCP_OIDC_ISSUER (Wave 4)
        │
  transport.handleRequest
```

Decisions:

- **`timingSafeEqual`** for bearer compare — not string `===`. Token
  comparison must be constant-time.
- **Reverse-proxy mode** (`TRUST_FORWARDED_AUTH=1`) — when set, the
  middleware trusts `x-forwarded-user` / `x-forwarded-email` and skips
  bearer check. This is the standard deployment pattern behind
  oauth2-proxy / Cloudflare Access / corporate SSO.
- **OIDC** is deferred to Wave 4 — uses `@modelcontextprotocol/sdk`'s
  `server/auth/*` helpers + `jose` for JWK fetch.

### Layer 2 — SAP session

Dedicated tool `sap_connect` — not HTTP middleware. Rationale:

- MCP doesn't define HTTP-body→tool-args credential passthrough. Adding
  it would be non-standard and would complicate the Okta migration.
- `sap_connect` is self-documenting: AI assistants can see the tool
  in the catalogue and call it naturally.
- It supports both "bring your own SAP credentials" and "use a named
  system the admin configured" without branching the middleware.

Shape (Zod):

```typescript
{
  // Mutually exclusive branches; Zod refinement enforces exactly one.
  systemId?: string;              // preferred when set
  baseUrl?: string;
  username?: string;
  password?: string;
  client?: string;
  auth?: 'basic' | 'btp-sso';     // future: 'x509', 'jwt'
}
```

## Multi-system routing

Resolution order (first match wins):

1. `sap_connect` tool argument `systemId`
2. HTTP header `x-sap-system-id`
3. Env `SAP_DEFAULT_SYSTEM_ID`
4. First system in `systems.yaml`

`systems.yaml` (parsed by `@abapify/adt-config`):

```yaml
systems:
  DEV:
    baseUrl: https://dev.example.com
    client: '100'
    auth: basic
    # credentials never live in this file — resolved from
    # SAP_DEV_USERNAME / SAP_DEV_PASSWORD env vars at sap_connect time
  PROD:
    baseUrl: https://prod.example.com
    client: '100'
    auth: btp-sso
```

Credentials are **always** resolved from env vars named `SAP_<ID>_USERNAME`
/ `SAP_<ID>_PASSWORD` — never from the YAML — so the config file is safe
to commit to a private repo.

## Transactional changesets

### Motivation

Today every object save is its own lock → write → activate → unlock
cycle. Multi-object refactors (e.g. "rename this domain and every DDIC
object that references it") cannot roll back cleanly — if step 5 fails,
steps 1–4 are already activated.

A changeset groups N pending operations and defers all activations to a
single `commit` step. On `rollback` every lock is released and no
activations occur.

### State machine

```
  idle ──sap_begin_changeset──► open ──sap_add_to_changeset──► open
                                  │                              │
                                  ├──sap_rollback_changeset──► closed (discarded)
                                  │
                                  └──sap_commit_changeset────► closed (committed)
```

Only **one** changeset may be open per MCP session. Nested changesets
are rejected at the tool layer.

### Service

A new `ChangesetService` in `@abapify/adt-cli` owns the state. Both the
CLI (`adt changeset begin|add|commit|rollback`) and the MCP tools
delegate to it — this is the only way to keep the parity invariant
honest.

## Alternatives considered

| Alternative                               | Why rejected                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| SSE transport                             | Deprecated in MCP spec; Streamable HTTP is the modern answer.          |
| Stateless HTTP (no session cache)         | Kills the main perf benefit; each call still pays the CSRF tax.        |
| Credentials in HTTP header on every call  | Non-standard, leaks to proxy logs, breaks OIDC migration path.         |
| Credentials in MCP `initialize` params    | Not in MCP spec; different SDKs handle it inconsistently.              |
| Shared global `AdtClient` across sessions | Violates "1 SAP security session per user" — SAP will 403 concurrents. |
| Putting `ChangesetService` in `adt-mcp`   | Breaks CLI ↔ MCP parity invariant; CLI would have no way to commit.    |
| Writing creds to disk for reuse           | Security-hostile and rejected by every review round.                   |
| Implementing our own HTTP framework       | SDK ships `StreamableHTTPServerTransport` — re-use it.                 |

## Risks

- **Leaked SAP sessions.** SAP permits 1 security session per user; a
  leaked session locks the user out of ADT for ~10 minutes. Mitigation:
  explicit + tool-driven + idle-TTL cleanup, plus a `sap_sessions`
  admin tool to enumerate and force-close.
- **Lock leaks on crash.** If the MCP process dies mid-session, SAP
  locks persist until the lock TTL expires. Mitigation: idempotent
  unlock on startup for any `~/.adt/mcp-locks.json` file the
  previous process wrote. (Best-effort; v1 documents the risk, v2
  implements the crash journal.)
- **Changeset partial failure.** If `commit` fails halfway through,
  some objects may already be activated. Mitigation: commit order
  is deterministic, every partial failure is reported with the
  activated vs non-activated object list, and the session keeps
  the remaining locks so the user can retry.
