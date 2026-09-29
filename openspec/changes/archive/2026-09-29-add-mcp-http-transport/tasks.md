# Tasks — `add-mcp-http-transport`

Waves reflect subagent parallelism. Each task lists the package(s) it
touches so waves don't collide. Parity tests in
`packages/adt-cli/tests/e2e/parity.*.test.ts` are mandatory for every
feature that ships a CLI command and an MCP tool.

## Wave 0 — proposal + scaffold (sequential, lead)

- [x] Write this OpenSpec change (`proposal.md`, `design.md`, `tasks.md`,
      `specs/adt-mcp/spec.md`).
- [x] Feature branch `feat/mcp-http-transport` off `main`.
- [x] Confirm `@modelcontextprotocol/sdk` ^1.27 is installed in
      `packages/adt-mcp/package.json`; add `zod` refinements util if
      missing.
- [x] Add `MCP_HTTP_PORT`, `MCP_AUTH_TOKEN`, `MCP_ALLOWED_HOSTS`,
      `MCP_ALLOWED_ORIGINS`, `MCP_SESSION_IDLE_MS`,
      `SAP_DEFAULT_SYSTEM_ID`, `TRUST_FORWARDED_AUTH` to the
      `adt-mcp` README's configuration section as placeholders.

## Wave 1 — HTTP transport, sessions, `sap_connect`, multi-system routing

Parallelisable subagents; all touch `packages/adt-mcp` and
`packages/adt-config`.

- [x] **adt-mcp #http-entry** — `src/bin/adt-mcp.ts` transport switch:
      if `--http` / `MCP_HTTP_PORT`, start HTTP server; otherwise keep
      existing stdio path untouched.
- [x] **adt-mcp #http-server** — new `src/lib/http/server.ts` that
      boots `node:http`, wires `hostHeaderValidation` + CORS, registers
      `POST /mcp`, `GET /mcp`, `DELETE /mcp` and delegates to
      `SessionRegistry`.
- [x] **adt-mcp #session-registry** — new `src/lib/http/session-registry.ts`
      owning the `Map<id, McpSession>`, TTL sweeper, and `closeSession()`
      cleanup routine (release locks, DELETE SAP session,
      `transport.close()`).
- [x] **adt-mcp #session-ctx** — new `ToolContext` variant that, when a
      session has an `AdtClient`, returns it from `getClient()` instead
      of constructing a fresh one per call. Stdio path keeps today's
      behaviour for backward compat.
- [x] **adt-mcp #sap-connect-tool** — new `src/lib/tools/sap-connect.ts`
      implementing `sap_connect`, `sap_disconnect`, `sap_list_systems`.
      Input validated by Zod with a `systemId XOR inline creds`
      refinement.
- [x] **adt-config #systems** — shipped as `src/lib/http/multi-system.ts`
      in `adt-mcp` (not `adt-config`). Typed loader for `~/.adt/systems.yaml` + env `SAP_SYSTEMS` override; credentials always resolved from
      `SAP_<ID>_USERNAME` / `SAP_<ID>_PASSWORD` env vars, never from
      YAML.
- [x] **adt-mcp #routing** — resolution helper that walks
      `arg → header x-sap-system-id → env → first configured` and
      returns a `ResolvedSystem` record.
- [x] **adt-mcp #mock-http** — extend `src/lib/mock/server.ts` so the
      integration mock can be driven over HTTP (used by the new tests).
- [x] **adt-mcp #http-tests** — `tests/http.integration.test.ts` covering
      session init, reuse, `sap_connect`, tool call, DELETE, and
      idle-TTL expiry.

## Wave 2 — MCP-level auth

- [x] **adt-mcp #auth-bearer** — `src/lib/http/auth.ts` middleware with
      `timingSafeEqual` compare against `MCP_AUTH_TOKEN`.
- [x] **adt-mcp #auth-forwarded** — optional reverse-proxy mode under
      `TRUST_FORWARDED_AUTH=1` that trusts `x-forwarded-user`.
- [x] **adt-mcp #auth-tests** — tests for missing token, wrong token,
      right token, disabled auth, and forwarded-auth paths.
- [x] **adt-mcp #host-cors-tests** — host-header and CORS allow-list
      tests against a malicious `Host` header and a disallowed
      `Origin`.

## Wave 3 — Transactional changesets (CLI + MCP + parity)

- [x] **adt-cli #changeset-service** — new `ChangesetService` in
      `packages/adt-cli/src/lib/services/changeset/` with `begin`,
      `add`, `commit`, `rollback`; exported from
      `packages/adt-cli/src/index.ts`.
- [x] **adt-cli #changeset-commands** — `adt changeset begin|add|commit|rollback`
      subcommands (thin wrappers, service pattern per
      `packages/adt-cli/AGENTS.md`).
- [x] **adt-mcp #changeset-tools** — new
      `src/lib/tools/sap-changeset.ts` exposing
      `changeset_begin`, `changeset_add`,
      `changeset_commit`, `changeset_rollback`. Tools delegate
      to the CLI service — no business logic in the MCP package.
- [x] **adt-mcp #changeset-registry** — session-scoped changeset state
      stored on `McpSession.changeset`; rejects nested begins.
- [x] **parity #changeset** — `packages/adt-cli/tests/e2e/parity.changeset.test.ts`
      drives both the CLI subcommand and the MCP tool through the same
      mock server and asserts equivalent results for every
      begin/add/commit/rollback scenario.

## Wave 4 — Okta / OIDC bearer (deferred / optional)

- [x] **adt-mcp #oidc-middleware** — JWT verify via `jose`; issuer and
      audience configured by `MCP_OIDC_ISSUER` / `MCP_OIDC_AUDIENCE`.
      JWKs fetched and cached per SDK `server/auth/*` helpers.
- [x] **adt-mcp #oidc-tests** — tests with a disposable issuer
      (e.g. static JWK + signed JWT fixtures) — no live Okta.
- [x] **adt-mcp #oidc-docs** — README section on Okta / Azure AD /
      Cognito setup, including scopes and audiences.

## Wave 5 — Deployment artefacts + docs

- [ ] **adt-mcp #dockerfile** — `packages/adt-mcp/Dockerfile.mcp`,
      distroless Node, `BUN_CONFIG_REGISTRY` build arg for JFrog.
      Deferred: no container artefact shipped; deployment docs cover
      process-level install in `docs/deployment/mcp-http.md`.
- [ ] **adt-mcp #compose** — `packages/adt-mcp/docker-compose.yml`
      with reverse-proxy + MCP service. Deferred with #dockerfile.
- [x] **adt-mcp #readme** — rewrite README intro to cover HTTP +
      stdio, auth model, multi-system routing, Docker deploy,
      changeset workflow.
- [x] **root AGENTS** — update the _MCP ↔ CLI Coupling_ section to
      call out HTTP transport and the changeset parity expectation.
- [x] **adt-mcp AGENTS** — update invariant #4 per
      `specs/adt-mcp/spec.md` and add a new "Session model" section.

## Wave 6 — Verification + PR (sequential, lead)

- [x] `bunx nx run-many -t build,test,typecheck,lint -p adt-mcp,adt-cli,adt-config`
- [x] `bunx nx format:write`
- [x] Manual smoke test: `MCP_HTTP_PORT=3333 MCP_AUTH_TOKEN=dev bun packages/adt-mcp/src/bin/adt-mcp.ts`
      then drive with a Streamable-HTTP MCP client.
- [ ] Docker smoke test — deferred with #dockerfile/#compose.
- [x] Commit waves as separate commits; push feature branch; open PR
      cross-linking [#110](https://github.com/abapify/adt-cli/pull/110).
