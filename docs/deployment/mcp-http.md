# Deploying the adt-mcp HTTP server

`@abapify/adt-mcp` ships two binaries:

| Binary         | Transport                   | Use case                                                                                    |
| -------------- | --------------------------- | ------------------------------------------------------------------------------------------- |
| `adt-mcp`      | stdio (JSON-RPC over pipes) | Local MCP clients that spawn the server as a subprocess (Claude, VS Code, Cursor, Kiro, …). |
| `adt-mcp-http` | Streamable HTTP             | Shared / remote deployments (Docker, Kubernetes, multi-user teams, browser clients).        |

This guide covers the HTTP transport. The stdio transport is documented in the [package README](../../packages/adt-mcp/README.md).

> **Spec of record.** This guide summarises the behaviour formalised in the `add-mcp-http-transport` OpenSpec change (`openspec/changes/add-mcp-http-transport/`). If the two disagree, the spec wins.

## Overview

The HTTP transport uses the MCP **Streamable HTTP** protocol (`POST /mcp`, `GET /mcp`, `DELETE /mcp`) from `@modelcontextprotocol/sdk`. Legacy MCP-over-SSE is not supported.

Key properties:

- **Session-scoped state.** Each MCP session (`Mcp-Session-Id` header) owns a cached `AdtClient`, its own SAP security session, a lock registry, and an optional active changeset. Across sessions the server is stateless.
- **Two-layer auth.** An outer layer protects the HTTP endpoint (none / bearer / reverse-proxy / OIDC JWT). An inner layer handles SAP credentials — these are never stored, and arrive per-session via the `sap_connect` tool or from a multi-system registry.
- **SAP-friendly.** One `sap_connect` per session triggers one SAP security-session handshake. Subsequent tool calls reuse the cached client, so you don't burn the "1 security session per user" budget.

## Quick start

### Docker (one-liner)

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -e MCP_AUTH_TOKEN=change-me \
  -e MCP_ALLOWED_HOSTS=localhost,127.0.0.1 \
  ghcr.io/abapify/adt-mcp:latest
```

The container listens on `0.0.0.0:3000` inside, but only the loopback of the host is exposed. Without `MCP_AUTH_TOKEN` the server refuses to bind beyond loopback in any sensible deployment — see [Security considerations](#security-considerations).

### docker compose

```bash
# Clone the repo just for the compose file (or copy it locally).
git clone https://github.com/abapify/adt-cli.git && cd adt-cli

# Minimal env file
cat > .env.mcp <<'EOF'
MCP_AUTH_TOKEN=change-me
MCP_ALLOWED_HOSTS=localhost,127.0.0.1
EOF

docker compose -f docker-compose.mcp.yaml --env-file .env.mcp up -d
```

See [`docker-compose.mcp.yaml`](../../docker-compose.mcp.yaml) for the oauth2-proxy skeleton.

### Behind a corporate npm proxy

If your build environment can't reach `registry.npmjs.org` directly (e.g. JFrog Artifactory):

```bash
docker build -f Dockerfile.mcp \
  --build-arg BUN_CONFIG_REGISTRY="$BUN_CONFIG_REGISTRY" \
  -t adt-mcp:local .
```

Never commit the registry URL — pass it as a build arg.

### Running locally from source

```bash
bunx nx build adt-mcp
node packages/adt-mcp/dist/bin/adt-mcp-http.mjs --port 3000
```

Smoke test:

```bash
curl -sf http://127.0.0.1:3000/healthz
# → {"status":"ok"}
```

## CLI reference

`adt-mcp-http` reads both CLI flags and environment variables. CLI flags win when both are set.

| Flag                                      | Env var                       | Default               | Description                                                                                           |
| ----------------------------------------- | ----------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------- |
| `--port <n>`, `-p`                        | `MCP_PORT`                    | `3000`                | Listen port.                                                                                          |
| `--host <addr>`, `-H`                     | `MCP_HOST`                    | `127.0.0.1`           | Bind address. Use `0.0.0.0` inside containers; rely on the container network or a proxy for access.   |
| `--ttl <ms>`                              | —                             | `1800000`             | Idle TTL per MCP session. Sessions without activity for longer are reaped and cleaned up.             |
| `--allowed-host <host>` (repeatable)      | `MCP_ALLOWED_HOSTS` (CSV)     | `localhost,127.0.0.1` | Additional values accepted in the `Host` header. Defence against DNS-rebinding.                       |
| `--auth-mode <mode>`                      | —                             | `none`                | One of `none`, `bearer`, `proxy`, `oauth`. Most flags below also imply a mode.                        |
| `--auth-token <value>`                    | `MCP_AUTH_TOKEN`              | —                     | Shared bearer secret; implies `--auth-mode=bearer`.                                                   |
| `--trust-forwarded-auth`                  | `TRUST_FORWARDED_AUTH`        | `false`               | Trust `x-forwarded-user` from an upstream proxy; implies `--auth-mode=proxy`.                         |
| `--oauth-issuer <url>`                    | `OAUTH_ISSUER`                | —                     | OIDC issuer URL (e.g. `https://<tenant>.okta.com`). Setting this implies `--auth-mode=oauth`.         |
| `--oauth-audience <val>` (repeatable)     | `OAUTH_AUDIENCE` (CSV)        | —                     | Expected JWT audience(s).                                                                             |
| `--oauth-jwks-uri <url>`                  | `OAUTH_JWKS_URI`              | issuer-derived        | Override the JWKS URI (otherwise derived from the OIDC discovery document).                           |
| `--oauth-required-scope <s>` (repeatable) | `OAUTH_REQUIRED_SCOPES` (CSV) | —                     | Each scope must be present in the `scope` claim.                                                      |
| `--oauth-user-claim <name>`               | `OAUTH_USER_CLAIM`            | `sub`                 | JWT claim used as the user identity forwarded to tool handlers.                                       |
| `--cors-origin <origin>` (repeatable)     | `MCP_CORS_ORIGIN` (CSV)       | —                     | CORS allow-list. Omit to block cross-origin browser clients.                                          |
| —                                         | `SAP_SYSTEMS_JSON`            | —                     | Inline multi-system registry as JSON (see [Multi-system configuration](#multi-system-configuration)). |
| —                                         | `SAP_SYSTEMS_FILE`            | `~/.adt/systems.json` | Path to a JSON systems registry.                                                                      |

Run `adt-mcp-http --help` for the authoritative list.

## Authentication modes

### `none` (default)

No check. Safe only when the server is bound to loopback (`127.0.0.1`) and used by the local user. The process logs a warning if `--auth-mode=none` is combined with a non-loopback host.

### `bearer` — shared token

```bash
adt-mcp-http --port 3000 --auth-token "$(openssl rand -hex 32)"
```

or

```bash
MCP_AUTH_TOKEN="$(openssl rand -hex 32)" adt-mcp-http --port 3000
```

Every request must include `Authorization: Bearer <token>`. The comparison uses `crypto.timingSafeEqual`.

```bash
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" \
     -H 'Content-Type: application/json' \
     -X POST http://127.0.0.1:3000/mcp \
     -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{...}}'
```

Use-case: single-user or team-internal deployments where an OIDC provider is overkill.

### `proxy` — reverse-proxy trust

```bash
TRUST_FORWARDED_AUTH=1 adt-mcp-http --port 3000 --host 127.0.0.1
```

The server trusts `x-forwarded-user` from the upstream proxy and skips bearer checks. Additional identity hints (`x-forwarded-email`, `x-forwarded-groups`) are collected for audit. **Only use this mode behind a proxy that strips these headers from untrusted input** — otherwise a malicious client can impersonate any user.

This is the simplest way to put adt-mcp behind Cloudflare Access, oauth2-proxy, or a traefik/nginx `auth_request`.

### `oauth` — OIDC JWT validation

```bash
adt-mcp-http --port 3000 \
  --oauth-issuer "https://<tenant>.okta.com" \
  --oauth-audience "api://adt-mcp" \
  --oauth-required-scope "adt:read"
```

The server fetches the JWKS from the issuer's OIDC discovery document, caches the keys, and validates every bearer token. Invalid / expired tokens yield HTTP 401 with an RFC 6750–compliant `WWW-Authenticate` challenge. Missing scopes yield `error="insufficient_scope"` so the client knows to re-consent rather than re-login.

Use-case: remote / multi-tenant deployments where end-users already authenticate against a corporate IdP.

## Okta recipe

1. **Create an OIDC API / resource server** in Okta (or a generic OIDC client with scopes).
2. Note the issuer URL — typically `https://<tenant>.okta.com` or `https://<tenant>.okta.com/oauth2/<authServerId>`.
3. Define an audience (e.g. `api://adt-mcp`) and one or more scopes (e.g. `adt:read`, `adt:write`).
4. Configure the MCP server:

   ```bash
   OAUTH_ISSUER="https://<tenant>.okta.com/oauth2/default"
   OAUTH_AUDIENCE="api://adt-mcp"
   OAUTH_REQUIRED_SCOPES="adt:read,adt:write"
   adt-mcp-http --port 3000 --host 0.0.0.0
   ```

5. In the IDE / client, obtain an access token for that audience (Okta CLI, Authorization Code + PKCE, client credentials, …) and send it as `Authorization: Bearer <jwt>`.

**Simpler alternative:** front the server with oauth2-proxy in OIDC mode and switch the server to `proxy` mode. oauth2-proxy handles the full browser login dance, and adt-mcp only has to trust `x-forwarded-user`. See the commented block in [`docker-compose.mcp.yaml`](../../docker-compose.mcp.yaml).

## Multi-system configuration

A single server can front multiple SAP systems selected by a logical `systemId` in the `sap_connect` tool call. The registry is loaded from (in order):

1. `SAP_SYSTEMS_JSON` — inline JSON string.
2. `SAP_SYSTEMS_FILE` — path to a JSON file.
3. `~/.adt/systems.json` — default path.

Schema (matches `MultiSystemConfig` in `packages/adt-mcp/src/lib/http/multi-system.ts`):

```json
{
  "DEV": {
    "baseUrl": "https://dev.example.com:44300",
    "client": "100"
  },
  "QAS": {
    "baseUrl": "https://qas.example.com:44300",
    "client": "200"
  }
}
```

Fields:

| Field     | Required | Description                   |
| --------- | -------- | ----------------------------- |
| `baseUrl` | ✅       | Full SAP base URL incl. port. |
| `client`  | —        | SAP client number.            |

**Credentials are never read from disk.** Any `username` / `password` keys in the JSON are dropped with a stderr warning on load. Credentials must always be supplied at runtime via the `sap_connect` tool call (directly, or via an external secrets injector that renders into the call). This is enforced by `normalise()` in `multi-system.ts` and is deliberate — on-disk credentials conflict with the "zero persisted secrets" goal of this deployment.

Resolution: `sap_connect { systemId: "DEV", username, password }` merges `baseUrl` + `client` from the registry with the call-supplied credentials, then performs the SAP handshake. An explicit `baseUrl` in the same call is mutually exclusive with `systemId` and will be rejected.

## Client examples

Once the server is running, wire it into your MCP client.

### Claude Desktop

```json
{
  "mcpServers": {
    "adt": {
      "type": "http",
      "url": "http://127.0.0.1:3000/mcp",
      "headers": {
        "Authorization": "Bearer change-me"
      }
    }
  }
}
```

### VS Code (`.vscode/mcp.json`)

```json
{
  "servers": {
    "adt": {
      "type": "http",
      "url": "http://127.0.0.1:3000/mcp",
      "headers": {
        "Authorization": "Bearer change-me"
      }
    }
  }
}
```

### Cursor

Settings → MCP → **Add server** → type `HTTP`, URL `http://127.0.0.1:3000/mcp`, add an `Authorization` header.

### Kiro

Kiro only supports Streamable HTTP — it cannot spawn stdio servers on your behalf. Add the same URL + `Authorization` header as above. This is the primary deployment that motivated the HTTP transport.

## Transactional changesets

Wave 3 adds four session-scoped tools that bundle multiple ADT writes into a single atomic unit:

| Tool                 | Purpose                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `changeset_begin`    | Open a new changeset on the current session. Acquires a transport if none is passed.       |
| `changeset_add`      | Append an operation (`update_source`, `activate_object`, `create_object`, …) to the batch. |
| `changeset_commit`   | Execute the batched operations in order, release locks, and return per-step results.       |
| `changeset_rollback` | Discard the changeset, release locks, and restore the previous state where possible.       |

Worked example (pseudocode):

```text
sap_connect          { systemId: "DEV" }
changeset_begin      { description: "Refactor ZCL_FOO" }
changeset_add        { op: "update_source", objectName: "ZCL_FOO", sourceCode: "..." }
changeset_add        { op: "activate_object", objectName: "ZCL_FOO", objectType: "CLAS" }
changeset_commit
sap_disconnect
```

If `changeset_commit` fails on step 2, step 1's source update is rolled back and the caller gets a structured error with the failing step index.

## Security considerations

- **TLS termination.** JWT signature validation does not replace transport encryption. Put a TLS-terminating proxy (traefik, nginx, Cloudflare, ALB) in front of adt-mcp in any network accessible beyond your own laptop.
- **Host header allow-list.** `MCP_ALLOWED_HOSTS` defeats DNS-rebinding. Always set this when binding beyond loopback.
- **CORS allow-list.** Browser clients outside the allow-list are blocked before the MCP transport sees them.
- **Constant-time token comparison.** Bearer tokens are checked with `crypto.timingSafeEqual`.
- **SAP security-session budget.** SAP allows **one security session per user**. Always call `sap_disconnect` (or let the transport close cleanly) — the server will also reap idle sessions after the configured TTL. Session cleanup releases every lock before destroying the SAP session.
- **Credential hygiene.** SAP `baseUrl/username/password` supplied at `sap_connect` time live only in session memory. They are never written to disk and never appear in logs.
- **`proxy` mode.** Only use `TRUST_FORWARDED_AUTH=1` behind a proxy that strips `x-forwarded-*` headers from untrusted input. Otherwise a request with a forged header will be accepted.

## Troubleshooting

| Symptom                                                   | Likely cause / fix                                                                                                   |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `401 unauthorized` with `WWW-Authenticate: Bearer ...`    | Missing / wrong token. Check `Authorization` header and `MCP_AUTH_TOKEN`.                                            |
| `401 ... error="insufficient_scope"`                      | JWT is valid but lacks a configured required scope. Re-consent with the missing scope.                               |
| `421 Misdirected Request`                                 | `Host` header not in `MCP_ALLOWED_HOSTS`. Add your public hostname (or front with a proxy that rewrites it).         |
| `CORS` error in browser devtools                          | Origin not in `MCP_CORS_ORIGIN`. Add it explicitly — the allow-list is not `*` by default.                           |
| Tool call returns `SAP session expired` or similar        | The cached `AdtClient` auth was rejected by SAP. Call `sap_disconnect`, then `sap_connect` again.                    |
| `adt auth` credentials seem out of sync                   | `adt-mcp-http` doesn't read `~/.adt/auth.json` — credentials flow through `sap_connect` args / the systems registry. |
| `EADDRINUSE`                                              | Another process is bound to `--port`. Pick a free one or stop the other service.                                     |
| Container exits with `fatal: MCP_AUTH_TOKEN ... required` | You set `--auth-mode=bearer` but no token. Provide `MCP_AUTH_TOKEN` or drop the mode flag.                           |
| Container exits with `fatal: --oauth-issuer ... required` | `--auth-mode=oauth` without an issuer. Set `OAUTH_ISSUER`.                                                           |

## Related

- Package README: [`packages/adt-mcp/README.md`](../../packages/adt-mcp/README.md)
- Agent guide: [`packages/adt-mcp/AGENTS.md`](../../packages/adt-mcp/AGENTS.md)
- Spec (source of truth): [`openspec/changes/add-mcp-http-transport/`](../../openspec/changes/add-mcp-http-transport/)
