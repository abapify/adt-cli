# Delta — `adt-mcp` capability

## MODIFIED Requirements

### Requirement: Stateless server — connection-per-call

> Previous wording (invariant #4 in `packages/adt-mcp/AGENTS.md`):
> "Each tool call creates its own AdtClient via ctx.getClient(args). The
> server holds no session, no cached client, and no credentials between
> calls."

The server SHALL support two transports with different state models:

- **stdio transport** — remains stateless connection-per-call by default.
  Each tool call constructs a fresh `AdtClient` from the arguments
  provided, and no state persists across calls.
- **Streamable HTTP transport** — session-scoped state. Each MCP session
  (identified by `Mcp-Session-Id`) owns a cached `AdtClient`, a lock
  registry, and an optional active changeset. State is cleaned up on
  session close (explicit `DELETE /mcp`, `sap_disconnect`, or idle TTL).
  Across sessions and processes no state persists; credentials are never
  written to disk.

#### Scenario: stdio remains stateless

- **GIVEN** `adt-mcp` started without `--http` and without `MCP_HTTP_PORT`
- **WHEN** two tool calls arrive carrying inline `baseUrl/username/password`
- **THEN** each call performs its own SAP security-session handshake and
  no state is shared between the calls.

#### Scenario: HTTP session caches the SAP client

- **GIVEN** an HTTP MCP session has successfully called `sap_connect`
- **WHEN** a subsequent tool call arrives on the same `Mcp-Session-Id`
- **THEN** the server reuses the cached `AdtClient` and does not perform
  a new SAP security-session handshake.

## ADDED Requirements

### Requirement: Streamable HTTP transport

The server SHALL expose a Streamable HTTP transport using the
`StreamableHTTPServerTransport` primitive from
`@modelcontextprotocol/sdk`, selected when `MCP_HTTP_PORT` is set or
`--http` is passed. The transport SHALL handle `POST /mcp`, `GET /mcp`,
and `DELETE /mcp` and SHALL assign session IDs via `randomUUID`.

#### Scenario: Initialize returns a session ID

- **GIVEN** a running HTTP MCP server
- **WHEN** a client sends a JSON-RPC `initialize` to `POST /mcp`
- **THEN** the response includes an `Mcp-Session-Id` header whose value
  is a UUID.

#### Scenario: Legacy SSE is not supported

- **WHEN** a client opens an SSE stream against the server
- **THEN** the server responds with HTTP 404 or 405, and documentation
  directs the client to Streamable HTTP.

### Requirement: Session lifecycle cleanup

When an HTTP MCP session ends (explicit `DELETE /mcp`, `sap_disconnect`,
or idle TTL expiry), the server SHALL release every lock held by the
session, SHALL `DELETE` the SAP security session, and SHALL close the
transport. Partial failures SHALL be logged but SHALL NOT abort the
remaining cleanup steps.

#### Scenario: DELETE releases locks and SAP session

- **GIVEN** a session that holds two object locks and an established SAP
  security session
- **WHEN** the client sends `DELETE /mcp` with the matching
  `Mcp-Session-Id`
- **THEN** both locks are released against SAP, the SAP security session
  is deleted, the transport is closed, and the session record is removed
  from the registry.

#### Scenario: Idle TTL expiry

- **GIVEN** `MCP_SESSION_IDLE_MS=60000` and a session with no activity
  for 70 seconds
- **WHEN** the idle sweeper runs
- **THEN** the same cleanup routine is executed as for an explicit
  `DELETE`.

### Requirement: MCP-layer bearer authentication

When `MCP_AUTH_TOKEN` is set, the HTTP transport SHALL reject any request
whose `Authorization: Bearer <token>` header does not match the
configured token. The comparison SHALL be constant-time
(`crypto.timingSafeEqual`). When `TRUST_FORWARDED_AUTH=1`, the bearer
check SHALL be skipped and the server SHALL instead require a non-empty
`x-forwarded-user` header.

#### Scenario: Wrong bearer is rejected

- **GIVEN** `MCP_AUTH_TOKEN=expected` and `TRUST_FORWARDED_AUTH` unset
- **WHEN** a request arrives with `Authorization: Bearer wrong`
- **THEN** the server responds with HTTP 401 and does not invoke the MCP
  transport.

#### Scenario: Reverse-proxy mode trusts forwarded user

- **GIVEN** `TRUST_FORWARDED_AUTH=1`
- **WHEN** a request arrives without `Authorization` but with
  `x-forwarded-user: alice`
- **THEN** the request is accepted and the user identity is available to
  tool handlers for logging.

### Requirement: Host header and CORS protection

The HTTP transport SHALL validate the `Host` header against
`MCP_ALLOWED_HOSTS` (default: `localhost`, `127.0.0.1`) and SHALL apply
CORS headers based on `MCP_ALLOWED_ORIGINS`.

#### Scenario: Disallowed Host header

- **GIVEN** `MCP_ALLOWED_HOSTS=localhost`
- **WHEN** a request arrives with `Host: attacker.example.com`
- **THEN** the server responds with HTTP 403.

### Requirement: SAP-session handshake tool `sap_connect`

The server SHALL expose a `sap_connect` tool that establishes a SAP
security session for the current MCP session. Input SHALL be either
`{ systemId }` (resolving a server-configured system) or a full
`{ baseUrl, username, password, client, auth }` bundle — exactly one
branch. On success the server SHALL cache the `AdtClient` on the session.

#### Scenario: Connect by systemId

- **GIVEN** `systems.yaml` contains a `DEV` entry and the env vars
  `SAP_DEV_USERNAME` / `SAP_DEV_PASSWORD` are set
- **WHEN** the client calls `sap_connect` with `{ systemId: "DEV" }`
- **THEN** the server resolves credentials from env, performs the SAP
  handshake, caches the client on the session, and returns
  `{ connected: true, systemId: "DEV" }`.

#### Scenario: Connect with inline credentials

- **WHEN** the client calls `sap_connect` with `baseUrl`, `username`,
  `password`, `client`
- **THEN** the server performs the SAP handshake and caches the client,
  without persisting credentials anywhere.

#### Scenario: Ambiguous input is rejected

- **WHEN** the client calls `sap_connect` with both `systemId` and
  `baseUrl`
- **THEN** the tool returns an error naming the two conflicting
  branches.

### Requirement: Multi-system routing resolution order

The server SHALL resolve the target SAP system using the first match
from: (1) `sap_connect` argument `systemId`, (2) HTTP header
`x-sap-system-id`, (3) env `SAP_DEFAULT_SYSTEM_ID`, (4) first entry in
the systems registry. Credentials SHALL always be read from
`SAP_<ID>_USERNAME` / `SAP_<ID>_PASSWORD` env vars, never from the
YAML/JSON registry file.

#### Scenario: Tool argument wins over header

- **GIVEN** a request with header `x-sap-system-id: TEST`
- **WHEN** the client also passes `systemId: "DEV"` to `sap_connect`
- **THEN** the resolved system is `DEV`.

### Requirement: Transactional changesets

The server SHALL expose `sap_begin_changeset`,
`sap_add_to_changeset`, `sap_commit_changeset`,
`sap_rollback_changeset` tools, all of which SHALL delegate to the
`ChangesetService` in `@abapify/adt-cli`. At most one changeset MAY be
open per MCP session.

#### Scenario: Commit applies all operations

- **GIVEN** an open changeset with two `update` operations queued
- **WHEN** the client calls `sap_commit_changeset`
- **THEN** the service applies both updates, activates the affected
  objects, releases every lock, and the session's changeset state
  returns to idle.

#### Scenario: Rollback discards operations and releases locks

- **GIVEN** an open changeset with one update queued and one lock held
- **WHEN** the client calls `sap_rollback_changeset`
- **THEN** no activation occurs, the lock is released, and the session's
  changeset state returns to idle.

#### Scenario: Nested begin is rejected

- **GIVEN** a session with an already open changeset
- **WHEN** the client calls `sap_begin_changeset` again
- **THEN** the tool returns an error without modifying the existing
  changeset.

### Requirement: CLI ↔ MCP parity for changesets

Every changeset operation SHALL be available as both an
`adt changeset …` CLI subcommand and an `sap_*_changeset` MCP tool, and
both SHALL exercise the same `ChangesetService`. A parity test at
`packages/adt-cli/tests/e2e/parity.changeset.test.ts` SHALL drive the
CLI and MCP paths through the same mock server and assert equivalent
results.

#### Scenario: Parity test covers commit and rollback

- **WHEN** the parity suite runs
- **THEN** it asserts that `adt changeset commit` and
  `sap_commit_changeset` produce the same object-state diffs against
  the mock, and likewise for `rollback`.
