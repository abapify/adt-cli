# adt-mcp Specification

## Purpose

MCP server bridging AI assistants to SAP ADT — tool registration, delegated/ambient authorization, scoped dispatch policies, Streamable HTTP transport, sessions, and changesets.

## Requirements

### Requirement: Delegated assistants receive a server-owned read catalogue

The server SHALL accept an exact signed delegated-assistant policy bound to
one principal, thread, execution, System, and Destination. The resulting MCP
catalogue SHALL contain every registered tool whose server-owned operation
class is `server` or `read`.

#### Scenario: Delegated assistant lists tools

- **GIVEN** a valid delegated-assistant credential requests the read envelope
- **WHEN** the client calls `tools/list`
- **THEN** the server advertises multiple permitted read tools without a
  client-provided tool-name allowlist

#### Scenario: A new read tool is registered

- **GIVEN** a new tool has a complete `read` catalogue classification
- **WHEN** a delegated assistant refreshes `tools/list`
- **THEN** the new tool is admitted without changing the client credential
  contract

### Requirement: Delegated read authority cannot widen

The server SHALL reject malformed delegated-assistant policies and SHALL deny
`safe_execute`, `write`, unknown, and out-of-Destination operations at both
catalogue and dispatch.

#### Scenario: Delegated assistant attempts a write

- **WHEN** the client requests or directly calls a write-class tool
- **THEN** the tool is absent from discovery and dispatch returns
  `mcp_scope_denied` before a Destination lease or SAP operation

#### Scenario: Delegated policy carries additional authority

- **WHEN** the signed claim adds a tool list, resource override, non-empty
  limits, another operation class, or an additional Destination
- **THEN** the invocation exposes no MCP tools

### Requirement: Code review checks remain bounded analysis

The server SHALL classify `atc_run` and `run_unit_tests`, including coverage,
as `safe_execute` operations. An authenticated credential containing only
`server` and `read` authority SHALL NOT see or dispatch them; SAP analysis
execution requires an explicit execution grant.

> Note: this change originally reclassified these checks as `read`. During
> PR #173 review the exposure of SAP analysis execution to ordinary read
> credentials was flagged as a security finding and deliberately reverted —
> the `safe_execute` classification is the intended end state.

#### Scenario: Delegated read assistant lists tools

- **GIVEN** a delegated assistant has only `read` authority for one
  Destination
- **WHEN** it lists tools or directly calls `atc_run` / `run_unit_tests`
- **THEN** the checks are absent from the catalogue and dispatch is denied
  before a Destination lease or SAP operation

#### Scenario: Read authority remains non-mutating and non-executing

- **WHEN** the same assistant lists or calls a mutation or an analysis
  execution
- **THEN** the operation is absent or denied before SAP state is created

### Requirement: Stricter scoped ATC remains supported

The server SHALL accept an exact object-bound `safe_execute` credential for
`atc_run` or `run_unit_tests` when a workflow chooses that narrower
execution policy.

#### Scenario: Workflow supplies an exact ATC grant

- **WHEN** a valid scoped `safe_execute` credential names `atc_run` and exact
  object keys
- **THEN** catalogue and dispatch enforce the existing scoped policy

### Requirement: Bounded analysis is a separate operation class

The server SHALL classify every MCP tool that creates diagnostic analysis
state as `safe_execute`, independently of its HTTP method and independently
of repository mutation authority.

#### Scenario: Read credential requests ATC

- **WHEN** a credential contains only the `read` class
- **THEN** `atc_run` is absent from the destination-mode tool list and a direct
  call is denied before a destination lease or tool handler

#### Scenario: Explicit bounded-analysis credential requests ATC

- **WHEN** a trusted request access snapshot contains `safe_execute`
- **THEN** the scope catalogue permits `atc_run` subject to all other
  destination and resource checks

### Requirement: Unsupported signed policies fail closed

The server SHALL not dispatch a signed invocation that includes
`safe_execute` until it can enforce every policy field required for that
operation.

#### Scenario: Future-form safe-execution credential arrives early

- **WHEN** a valid signed credential contains `safe_execute` but no supported
  exact execution policy exists
- **THEN** the server exposes no MCP tools through that invocation

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

### Requirement: Two transports, two client state models

Both transports SHALL share every tool handler, but SHALL differ in
`AdtClient` state: over **stdio** the server creates a fresh `AdtClient`
per tool call from the call arguments and no state persists across
calls; over **Streamable HTTP** each MCP session (`Mcp-Session-Id`)
owns a cached `AdtClient`, a lock registry, and an optional active
changeset, established via `sap_connect`. Stateful tools such as
`changeset_*` therefore require an HTTP session.

#### Scenario: stdio calls are stateless

- **GIVEN** the server runs on the stdio transport
- **WHEN** two consecutive tool calls arrive
- **THEN** each constructs its own `AdtClient` from its arguments and no
  client state carries over between the calls.

#### Scenario: HTTP session reuses the connected client

- **GIVEN** an HTTP session that called `sap_connect`
- **WHEN** subsequent tool calls arrive on the same `Mcp-Session-Id`
- **THEN** they reuse the session's cached `AdtClient` and lock
  registry.

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

> Deployment note: proxy mode trusts whatever client sets
> `x-forwarded-user`; the listener currently only warns on non-loopback
> binds. Enforcing the trusted-proxy boundary (loopback-only or
> allowlist enforcement) is tracked as follow-up work.

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

#### Scenario: Connect by local adt auth store

- **GIVEN** `~/.adt/sessions/DEV.json` exists on the server host
- **WHEN** the client calls `sap_connect` with `{ systemId: "DEV" }` and
  the multi-system registry has no `DEV` entry
- **THEN** the server resolves credentials/session via the local adt auth
  store bridge, performs the verification call, caches the client, and
  returns `{ connected: true, systemId: "DEV", source: "adt-cli-auth-store" }`.

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
the systems registry. Credentials SHALL be sourced at runtime (tool
arguments or env-backed system resolution) and SHALL NOT be read from the
YAML/JSON systems registry file. A local `~/.adt/sessions/<id>.json`
bridge MAY be used as a fallback resolution path for developer workflows.

#### Scenario: Tool argument wins over header

- **GIVEN** a request with header `x-sap-system-id: TEST`
- **WHEN** the client also passes `systemId: "DEV"` to `sap_connect`
- **THEN** the resolved system is `DEV`.

### Requirement: Transactional changesets

The server SHALL expose `changeset_begin`,
`changeset_add`, `changeset_commit`,
`changeset_rollback` tools, all of which SHALL delegate to the
`ChangesetService` in `@abapify/adt-cli`. At most one changeset MAY be
open per MCP session.

#### Scenario: Commit applies all operations

- **GIVEN** an open changeset with two `update` operations queued
- **WHEN** the client calls `changeset_commit`
- **THEN** the service applies both updates, activates the affected
  objects, releases every lock, and the session's changeset state
  returns to idle.

#### Scenario: Rollback releases locks without reverting applied source

- **GIVEN** an open changeset whose `changeset_add` calls already PUT
  source to SAP under lock
- **WHEN** the client calls `changeset_rollback`
- **THEN** no activation occurs, every lock is released, and the session's
  changeset state returns to idle. The already-written source PUTs are
  NOT reverted — SAP has no transactional discard over ADT; the inactive
  version stays on the system until the next edit/activate cycle
  (matching Eclipse ADT editor-close behaviour).

#### Scenario: Nested begin without force is rejected

- **GIVEN** a session with an already open changeset
- **WHEN** the client calls `changeset_begin` again without `force`
- **THEN** the tool returns an error without modifying the existing
  changeset.

#### Scenario: Forced begin rolls back and restarts

- **GIVEN** a session with an already open changeset
- **WHEN** the client calls `changeset_begin` with `force: true`
- **THEN** the server rolls back the existing changeset (releasing its
  locks, without reverting applied source) and opens a new changeset.

### Requirement: CLI ↔ MCP parity for changesets

Every changeset operation SHALL be available as both an
`adt changeset …` CLI subcommand and a `changeset_*` MCP tool
(`changeset_begin`, `changeset_add`, `changeset_commit`,
`changeset_rollback`), and
both SHALL exercise the same `ChangesetService`. A parity test at
`packages/adt-cli/tests/e2e/parity.changeset.test.ts` SHALL drive the
CLI and MCP paths through the same mock server and assert equivalent
results.

#### Scenario: Parity test covers commit and rollback

- **WHEN** the parity suite runs
- **THEN** it asserts that `adt changeset commit` and
  `changeset_commit` produce the same object-state diffs against
  the mock, and likewise for `rollback`.

### Requirement: CLI ↔ MCP parity scope for transport lifecycle tools

Global CLI/MCP parity SHALL apply to domain/business operations. Transport
lifecycle tools that are HTTP-session specific (`sap_connect`,
`sap_disconnect`) MAY exist only on MCP when no meaningful CLI equivalent
exists.

#### Scenario: sap lifecycle tools are MCP-only

- **WHEN** parity checks evaluate the command/tool matrix
- **THEN** `sap_connect` and `sap_disconnect` are treated as transport
  lifecycle exceptions and do not require `adt` CLI subcommands.
