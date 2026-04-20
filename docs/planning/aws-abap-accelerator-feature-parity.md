# Feature Parity Analysis: AWS ABAP Accelerator vs abapify/adt-mcp

**Date:** 2026-04-20
**Status:** Proposal
**Compared against:** [aws-solutions-library-samples/guidance-for-deploying-sap-abap-accelerator-for-amazon-q-developer](https://github.com/aws-solutions-library-samples/guidance-for-deploying-sap-abap-accelerator-for-amazon-q-developer) (commit `8d715c9`)

---

## Executive Summary

The AWS ABAP Accelerator is an enterprise-grade MCP server (Python/FastMCP) designed for Amazon Q Developer and Kiro, providing 15 SAP development tools with a strong focus on **deployment flexibility**, **enterprise multi-tenancy**, and **principal propagation authentication**. By contrast, `@abapify/adt-mcp` is a developer-grade MCP server (TypeScript) with **90+ tools**, deep ADT coverage, and a type-safe contract-driven architecture, but it currently supports only **stdio transport** and **per-call basic auth**.

**Key findings:**

- **Tool functionality**: adt-mcp has **far superior** ADT coverage (~90 tools vs 15). Every tool the AWS project offers has an equivalent or better counterpart in adt-mcp.
- **Deployment & transport**: The AWS project supports **Streamable HTTP**, **Docker**, **ECS Fargate**, and **multi-system routing**. adt-mcp only supports stdio. This is the **single biggest gap**.
- **Authentication**: The AWS project supports **OAuth/OIDC principal propagation**, **X.509 certificate auth**, **AWS Secrets Manager**, **keychain**, and **interactive credential input**. adt-mcp supports only **per-call basic auth**. This is the **second biggest gap**.
- **Enterprise features**: The AWS project has **usage tracking**, **audit logging**, **RBAC scaffolding**, **rate limiting**, **multi-tenant session management**, and **health checks**. adt-mcp has none of these.
- **Overall experience**: The AWS project provides a polished, documented "unbox and run" experience for Q Developer / Kiro users with Docker and cloud deployment guides. adt-mcp requires manual configuration and is only documented for stdio-based desktop clients.

---

## 1. Tool-by-Tool Comparison

### 1.1 AWS ABAP Accelerator Tools (15 total)

| #   | AWS Tool                      | Description              | adt-mcp Equivalent                              | Status                                    |
| --- | ----------------------------- | ------------------------ | ----------------------------------------------- | ----------------------------------------- |
| 1   | `connection_status`           | Check SAP connection     | `discovery` + `system-info`                     | ✅ Covered (richer)                       |
| 2   | `get_objects`                 | List objects in package  | `list-package-objects`                          | ✅ Covered                                |
| 3   | `get_source`                  | Get source code          | `get-source`                                    | ✅ Covered                                |
| 4   | `search_object`               | Search objects           | `search-objects` + `grep-objects`               | ✅ Covered (richer)                       |
| 5   | `create_object`               | Create ABAP object       | `create-object` + type-specific tools           | ✅ Covered (richer)                       |
| 6   | `update_source`               | Update source code       | `update-source`                                 | ✅ Covered                                |
| 7   | `check_syntax`                | Syntax check             | `check-syntax`                                  | ✅ Covered                                |
| 8   | `activate_object`             | Activate object          | `activate-object`                               | ✅ Covered                                |
| 9   | `run_atc_check`               | ATC quality checks       | `atc-run`                                       | ✅ Covered                                |
| 10  | `run_unit_tests`              | Unit tests               | `run-unit-tests`                                | ✅ Covered                                |
| 11  | `get_test_classes`            | Get test classes         | `get-test-classes`                              | ✅ Covered                                |
| 12  | `get_migration_analysis`      | Migration analysis       | ❌ No equivalent                                | 🔴 **Gap**                                |
| 13  | `create_or_update_test_class` | Create/update test class | `create-object` (type=CLAS)                     | ⚠️ Partial — no dedicated test-class tool |
| 14  | `activate_objects_batch`      | Batch activation         | `activate-package`                              | ✅ Covered                                |
| 15  | `get_transport_requests`      | List transports          | `cts-list-transports` + `cts-search-transports` | ✅ Covered (richer)                       |

### 1.2 adt-mcp Exclusive Tools (75+ beyond parity)

adt-mcp has tools that the AWS project entirely lacks:

- **DDIC tools**: `get-table`, `get-table-contents`, `get-domain`, `get-data-element`, `get-structure`
- **CDS/RAP tools**: `get-cds-ddl`, `get-cds-dcl`, `get-bdef`, `create-bdef`, `delete-bdef`, `get-srvd`, `create-srvd`, `get-srvb`, `create-srvb`, `publish-service-binding`, `unpublish-srvb`
- **Code navigation**: `find-definition`, `find-references`, `get-callers-of`, `get-callees-of`, `get-type-hierarchy`
- **Transport management**: `cts-create-transport`, `cts-release-transport`, `cts-delete-transport`, `cts-update-transport`, `cts-reassign-transport`, `cts-search-transports`
- **Function modules**: `get-function-group`, `get-function`, `create-function-group`, `create-function-module`, `delete-function-module`
- **Git/export/import**: `git-export`, `checkin`, `import-object`, `import-package`, `import-transport`
- **gCTS**: full gCTS surface
- **RFC**: `call-rfc` (SOAP-over-HTTP)
- **FLP**: `list-flp-catalogs`, `list-flp-groups`, `list-flp-tiles`, `get-flp-tile`
- **SSL/PSE**: `list-pses`, `list-certs`, `upload-cert`, `delete-cert`
- **BAdI**: `get-badi`, `create-badi`, `delete-badi`
- **Utilities**: `grep-objects`, `grep-packages`, `pretty-print`, `run-abap`, `run-query`, `lock-object`, `unlock-object`, `clone-object`, `stat-package`, `lookup-user`

**Verdict:** adt-mcp is **far ahead** on tool coverage. The only functional gap is the migration analysis tool.

---

## 2. Deployment & Transport Gap Analysis

This is the **critical gap**. The AWS project is designed to be deployed in multiple ways; adt-mcp supports only one.

| Capability                         | AWS ABAP Accelerator                          | adt-mcp                                            | Gap             |
| ---------------------------------- | --------------------------------------------- | -------------------------------------------------- | --------------- |
| **MCP Transport: stdio**           | ❌ Not supported                              | ✅ Supported                                       | —               |
| **MCP Transport: Streamable HTTP** | ✅ via FastMCP                                | ❌ Not supported                                   | 🔴 **Critical** |
| **MCP Transport: SSE**             | ✅ via FastMCP                                | ❌ Not supported                                   | 🔴 **Critical** |
| **Local deployment (bare)**        | ✅ `python main.py`                           | ✅ `npx @abapify/adt-mcp`                          | —               |
| **Docker container**               | ✅ Full Dockerfile, multi-arch                | ⚠️ Dockerfile exists but for CLI, not MCP server   | 🟡 **Gap**      |
| **Cloud deployment (ECS Fargate)** | ✅ Full task definition, IAM roles, ALB guide | ❌ Not supported                                   | 🔴 **Critical** |
| **Health check endpoint**          | ✅ `/health`                                  | ❌ Not available                                   | 🟡 Gap          |
| **Multi-system routing**           | ✅ `x-sap-system-id` header                   | ❌ per-call baseUrl only                           | 🟡 Gap          |
| **Configuration via env vars**     | ✅ Comprehensive `.env`                       | ❌ per-call params only                            | 🟡 Gap          |
| **Configuration via YAML**         | ✅ `sap-systems.yaml`                         | ❌ Not available (adt-config exists but not wired) | 🟡 Gap          |

### What "Streamable HTTP" enables

Streamable HTTP transport is **required** for:

- Amazon Q Developer integration (Q Developer only supports `url`-based MCP, not stdio)
- AWS Kiro integration (same)
- ECS Fargate / cloud deployment (no stdin/stdout available)
- Multi-user shared server (stdio is 1:1 process-to-client)
- Docker-based deployment (needs HTTP for external clients)

Without Streamable HTTP, adt-mcp **cannot** be used with Q Developer or Kiro, and cannot be deployed centrally.

---

## 3. Authentication & Security Gap Analysis

| Capability                         | AWS ABAP Accelerator                   | adt-mcp                                       | Gap             |
| ---------------------------------- | -------------------------------------- | --------------------------------------------- | --------------- |
| **Basic auth (per-call)**          | ✅                                     | ✅                                            | —               |
| **Basic auth (env vars / stored)** | ✅ Multiple providers                  | ❌ per-call only                              | 🟡 Gap          |
| **OAuth 2.0 / OIDC**               | ✅ Full flow (Cognito, Okta, Entra ID) | ❌ Not supported                              | 🔴 **Critical** |
| **Principal Propagation**          | ✅ X.509 cert generation               | ❌ Not supported                              | 🔴 **Critical** |
| **AWS Secrets Manager**            | ✅                                     | ❌ Not supported                              | 🟡 Gap          |
| **OS Keychain**                    | ✅                                     | ❌ Not in MCP (exists in adt-auth)            | 🟡 Gap          |
| **Interactive credential input**   | ✅ Docker startup prompt               | ❌ Not supported                              | 🟡 Gap          |
| **CSRF token management**          | ✅ Session-based                       | ✅ SessionManager (security session protocol) | —               |
| **Custom CA certificates**         | ✅ CUSTOM_CA_CERT_PATH                 | ❌ Not configurable                           | 🟡 Gap          |
| **SSL verification toggle**        | ✅ SSL_VERIFY env var                  | ❌ Not configurable                           | 🟡 Gap          |

### Principal Propagation — Deep Dive

The AWS project's killer enterprise feature:

1. User authenticates via OAuth (Cognito/Okta/Entra ID)
2. Server extracts user identity from JWT token
3. Server generates an **ephemeral X.509 certificate** with SAP username as CN
4. Server connects to SAP using **certificate-based auth** (SNC/X.509)
5. SAP enforces that user's authorizations

This means: **multiple users share one MCP server, each acting under their own SAP identity.** This is essential for enterprise deployment where a team shares a centralized MCP server.

adt-mcp's per-call basic auth model means every tool call must include credentials, which works for single-developer stdio but not for shared deployment.

---

## 4. Enterprise Features Gap Analysis

| Capability                          | AWS ABAP Accelerator                     | adt-mcp                   | Gap    |
| ----------------------------------- | ---------------------------------------- | ------------------------- | ------ |
| **Multi-tenant session management** | ✅ Per-user SAP clients                  | ❌ Stateless per-call     | 🔴 Gap |
| **Usage tracking / analytics**      | ✅ Per-tool metrics (duration, success)  | ❌ Not available          | 🟡 Gap |
| **Audit logging**                   | ✅ Structured logging (structlog)        | ❌ Basic console only     | 🟡 Gap |
| **Rate limiting**                   | ✅ Middleware-based                      | ❌ Not available          | 🟡 Gap |
| **RBAC scaffolding**                | ✅ `rbac_manager.py` (empty but planned) | ❌ Not planned            | 🟡 Gap |
| **CORS configuration**              | ✅ Configurable                          | ❌ Not applicable (stdio) | 🟡 Gap |
| **Request/response middleware**     | ✅ FastAPI middleware stack              | ❌ Not available          | 🟡 Gap |
| **Response optimization**           | ✅ `response_optimizer.py`               | ❌ Not available          | 🟡 Gap |
| **Error tracking with context**     | ✅ Per-tool error capture                | ⚠️ Basic error handling   | 🟡 Gap |

---

## 5. Object Type Support Comparison

### 5.1 AWS ABAP Accelerator — Specialized Handlers

The AWS project has deep, specialized handlers for certain RAP object types:

| Handler                                  | Description                                         | adt-mcp equivalent                        |
| ---------------------------------------- | --------------------------------------------------- | ----------------------------------------- |
| `cds_handler.py` (56KB!)                 | Full CDS view create/update with DDL generation     | `create-object` (generic) + `get-cds-ddl` |
| `class_handler.py` (20KB)                | Class create with interfaces, methods, test classes | `create-object` (generic)                 |
| `behavior_definition_handler.py` (7.5KB) | BDEF create with managed/unmanaged scenarios        | `create-bdef`                             |
| `service_definition_handler.py` (18KB)   | SRVD create with exposure logic                     | `create-srvd`                             |
| `service_binding_handler.py` (13KB)      | SRVB create + publish                               | `create-srvb` + `publish-service-binding` |

**Key insight:** The AWS project's CDS handler generates complete DDL source code for CDS views with associations, annotations, and compositions. adt-mcp relies on the AI client to generate source code.

### 5.2 Migration Analysis (Unique to AWS)

The AWS project includes migration analysis tooling:

- Identifies obsolete statements in ABAP code
- Suggests modern equivalents (ABAP for Cloud)
- Analyzes compatibility with SAP BTP / S/4HANA Cloud

adt-mcp does **not** have an equivalent. The ADT API endpoint for this exists (`/sap/bc/adt/compatibility/...`) but no contract has been added.

---

## 6. Developer Experience Comparison

| Aspect                     | AWS ABAP Accelerator                         | adt-mcp                             |
| -------------------------- | -------------------------------------------- | ----------------------------------- |
| **Setup time**             | ~5 min (clone → pip install → set env → run) | ~2 min (npx @abapify/adt-mcp)       |
| **Q Developer support**    | ✅ First-class (`url`-based config)          | ❌ Not possible (stdio only)        |
| **Kiro support**           | ✅ First-class                               | ❌ Not possible                     |
| **Claude Desktop**         | ❌ Not supported (no stdio)                  | ✅ First-class                      |
| **VS Code / Copilot**      | ⚠️ Requires HTTP proxy                       | ✅ First-class                      |
| **Cursor / Windsurf**      | ⚠️ Requires HTTP proxy                       | ✅ First-class                      |
| **Docker experience**      | ✅ One-command start, interactive creds      | ⚠️ CLI only, no MCP server mode     |
| **Multi-system switching** | ✅ YAML config + header routing              | ❌ Manual per-call baseUrl          |
| **Documentation**          | ✅ Comprehensive README (47KB)               | ✅ Good README but deployment-light |
| **Error messages**         | ✅ Contextual with auth info                 | ✅ Structured JSON                  |
| **Troubleshooting guide**  | ✅ SSL, OAuth, connection issues             | ❌ Not provided                     |

---

## 7. Architecture Quality Comparison

| Aspect                        | AWS ABAP Accelerator                     | adt-mcp                                          | Winner  |
| ----------------------------- | ---------------------------------------- | ------------------------------------------------ | ------- |
| **Type safety**               | ⚠️ Python typing, manual XML (xmltodict) | ✅ Full XSD→schema→contract pipeline             | adt-mcp |
| **Schema-driven**             | ❌ Hand-written XML parsing              | ✅ Generated from W3C XSD                        | adt-mcp |
| **Contract testing**          | ❌ No visible tests                      | ✅ Comprehensive mock server + integration tests | adt-mcp |
| **ADT protocol fidelity**     | ⚠️ Approximation (398KB sap_client.py)   | ✅ Exact (per-endpoint contracts)                | adt-mcp |
| **Code organization**         | ⚠️ Monolithic (sap_client.py = 398KB)    | ✅ Modular (1 file per tool, separate packages)  | adt-mcp |
| **Extensibility**             | ⚠️ Add methods to sap_client.py          | ✅ Plugin architecture, one-file-per-tool        | adt-mcp |
| **Security session handling** | ⚠️ Basic CSRF                            | ✅ Full 3-step security session protocol         | adt-mcp |

---

## 8. Implementation Plan

### Phase 1: Streamable HTTP Transport (Critical — unlocks everything else)

**Goal:** adt-mcp serves over HTTP, enabling Q Developer, Kiro, Docker, and cloud deployment.

**Scope:**

- Add Streamable HTTP transport alongside existing stdio transport
- Add SSE transport as fallback for older clients
- CLI flag: `adt-mcp --transport stdio|http|sse --port 8000 --host 0.0.0.0`
- Health check endpoint: `GET /health`
- CORS configuration support

**Implementation details:**

- The `@modelcontextprotocol/sdk` already includes `StreamableHTTPServerTransport` and `SSEServerTransport`
- Need a lightweight HTTP server (e.g., Node's built-in `http` module or `express`)
- Wire transport selection in `src/bin/adt-mcp.ts`
- Maintain backward compatibility: default remains stdio

**Files to modify/create:**

- `packages/adt-mcp/src/bin/adt-mcp.ts` — add transport selection
- `packages/adt-mcp/src/lib/http-server.ts` — new HTTP server wrapper
- `packages/adt-mcp/src/lib/health.ts` — health endpoint

**Estimated effort:** Medium

---

### Phase 2: Server-Side Configuration & Multi-System Routing

**Goal:** Configure SAP connection once at server level, not per-call.

**Scope:**

- Support env vars (`SAP_HOST`, `SAP_CLIENT`, `SAP_USERNAME`, `SAP_PASSWORD`)
- Support YAML config file (`sap-systems.yaml`) for multi-system setups
- Support `x-sap-system-id` HTTP header for system selection
- Priority order: tool parameter → HTTP header → env var → config file
- Wire `@abapify/adt-config` into MCP server (it already exists but isn't used)

**Implementation details:**

- Add `ServerConfig` type to `types.ts` with optional stored credentials
- Modify `ToolContext` to support server-level defaults
- When Streamable HTTP is active, read `x-sap-system-id` header from request
- Connection params become optional in tool schemas when server config provides defaults
- SSL settings: `SSL_VERIFY`, `CUSTOM_CA_CERT_PATH`

**Files to modify/create:**

- `packages/adt-mcp/src/lib/types.ts` — extend with ServerConfig
- `packages/adt-mcp/src/lib/config.ts` — config loading (env + YAML)
- `packages/adt-mcp/src/lib/tools/shared-schemas.ts` — make connection params optional
- `packages/adt-mcp/src/lib/server.ts` — accept config, wire defaults

**Estimated effort:** Medium

---

### Phase 3: Docker MCP Server Mode

**Goal:** Ship a production-ready Docker image for the MCP server.

**Scope:**

- New Dockerfile (or extend existing) with MCP server entrypoint
- Streamable HTTP transport on port 8000 by default
- Support for env-based, interactive, and multi-system credential providers
- Multi-arch support (amd64/arm64)
- Non-root user for security
- Health check in Dockerfile

**Implementation details:**

- Extend existing `Dockerfile` with a second stage/target for MCP server
- `CMD ["node", "packages/adt-mcp/dist/bin/adt-mcp.mjs", "--transport", "http", "--port", "8000"]`
- Environment variable passthrough for SAP config
- Docker Compose example for quick start

**Files to create:**

- `Dockerfile.mcp` (or multi-target in existing Dockerfile)
- `docker-compose.mcp.yaml` — example compose file
- `docs/deployment/docker-mcp.md` — setup guide

**Estimated effort:** Small

---

### Phase 4: Credential Provider Framework

**Goal:** Support multiple credential storage backends beyond per-call basic auth.

**Scope:**

- Credential provider interface with implementations:
  - `env` — from environment variables
  - `interactive` — prompt at startup (for Docker)
  - `interactive-multi` — prompt per system from YAML config
  - `keychain` — OS keychain (wire existing `@abapify/adt-auth`)
  - `aws-secrets` — AWS Secrets Manager
- Provider selection via `CREDENTIAL_PROVIDER` env var

**Implementation details:**

- `@abapify/adt-auth` already has keychain/browser-auth infrastructure
- Create `CredentialProvider` interface in `packages/adt-mcp/src/lib/auth/`
- Each provider implements `getCredentials(systemId: string): Promise<{username, password}>`
- Interactive providers use process.stdin for Docker TTY input
- AWS Secrets Manager provider uses `@aws-sdk/client-secrets-manager`

**Files to create:**

- `packages/adt-mcp/src/lib/auth/credential-provider.ts` — interface
- `packages/adt-mcp/src/lib/auth/env-provider.ts`
- `packages/adt-mcp/src/lib/auth/interactive-provider.ts`
- `packages/adt-mcp/src/lib/auth/keychain-provider.ts`
- `packages/adt-mcp/src/lib/auth/aws-secrets-provider.ts`

**Estimated effort:** Medium

---

### Phase 5: OAuth / OIDC Authentication

**Goal:** Support OAuth-based user identity for multi-user deployments.

**Scope:**

- OAuth 2.0 authorization code flow with PKCE
- OIDC discovery (`.well-known/openid-configuration`)
- Support for AWS Cognito, Okta, Microsoft Entra ID
- Extract user identity from JWT access/ID token
- Map OAuth user → SAP username (algorithmic + exception-based)

**Implementation details:**

- Use `@modelcontextprotocol/sdk`'s built-in OAuth support if available, or implement custom middleware
- Add OAuth callback endpoint when running in HTTP mode
- JWT validation using `jose` library
- User mapping configuration via env var or config file

**Files to create:**

- `packages/adt-mcp/src/lib/auth/oauth-provider.ts`
- `packages/adt-mcp/src/lib/auth/jwt-validator.ts`
- `packages/adt-mcp/src/lib/auth/user-mapper.ts`
- `packages/adt-mcp/src/lib/server/oauth-routes.ts`

**Estimated effort:** Large

---

### Phase 6: Principal Propagation (X.509 Certificate Auth)

**Goal:** Enable per-user SAP authentication via ephemeral X.509 certificates.

**Scope:**

- Generate ephemeral X.509 client certificates with SAP username as CN
- Sign certificates with a configurable CA certificate/key pair
- Use certificates for mutual TLS to SAP system
- Certificate lifecycle management (short-lived, per-request)

**Implementation details:**

- Use Node.js `crypto` module for certificate generation (or `node-forge`)
- CA cert/key loaded from file, env var, or AWS Secrets Manager
- Extend `AdtClient` to support certificate-based authentication
- This requires `adt-client` adapter changes for mTLS

**Files to create:**

- `packages/adt-mcp/src/lib/auth/principal-propagation.ts`
- `packages/adt-mcp/src/lib/auth/cert-generator.ts`
- Modify `packages/adt-client/src/adapter.ts` for mTLS support

**Estimated effort:** Large

---

### Phase 7: Enterprise Middleware & Observability

**Goal:** Add enterprise-grade operational features.

**Scope:**

- **Usage tracking**: per-tool metrics (duration, success/failure, user, system)
- **Audit logging**: structured JSON logging with request context
- **Rate limiting**: configurable per-user/per-tool rate limits
- **Request context**: propagate user identity, system ID, request ID through tool calls
- **Response optimization**: optional response summarization for large outputs

**Implementation details:**

- Middleware stack for the HTTP server (before/after tool calls)
- Structured logging using existing `@abapify/logger` package
- Metrics exposed via `/metrics` endpoint (Prometheus-compatible) or CloudWatch
- Rate limiter using in-memory sliding window (no external deps)

**Files to create:**

- `packages/adt-mcp/src/lib/middleware/usage-tracker.ts`
- `packages/adt-mcp/src/lib/middleware/audit-logger.ts`
- `packages/adt-mcp/src/lib/middleware/rate-limiter.ts`
- `packages/adt-mcp/src/lib/middleware/request-context.ts`

**Estimated effort:** Medium

---

### Phase 8: Cloud Deployment Guide (ECS Fargate / Bedrock AgentCore)

**Goal:** Provide production deployment documentation and infrastructure templates.

**Scope:**

- ECS Fargate task definition template
- IAM role policies (task role, execution role)
- ALB/NLB configuration for HTTP endpoint
- AWS Secrets Manager + Parameter Store integration guide
- Terraform/CDK templates (stretch)
- Troubleshooting guide

**Files to create:**

- `docs/deployment/ecs-fargate.md` — step-by-step guide
- `docs/deployment/iam-policies.md` — IAM role templates
- `deploy/ecs-task-definition.json` — template
- `deploy/docker-compose.production.yaml` — production compose

**Estimated effort:** Medium (documentation-heavy)

---

### Phase 9: Migration Analysis Tool

**Goal:** Add the one functional tool that the AWS project has that adt-mcp lacks.

**Scope:**

- New MCP tool: `get-migration-analysis`
- Contract for ADT compatibility/migration endpoint
- Returns obsolete statement analysis and modern equivalents

**Implementation details:**

- Research the ADT API endpoint (likely `/sap/bc/adt/compatibility/...` or similar)
- Add contract to `@abapify/adt-contracts`
- Add schema to `@abapify/adt-schemas` if needed
- Add tool to `packages/adt-mcp/src/lib/tools/get-migration-analysis.ts`

**Estimated effort:** Small

---

### Phase 10: Q Developer & Kiro Integration Documentation

**Goal:** First-class documentation for Amazon Q Developer and Kiro users.

**Scope:**

- Q Developer MCP configuration guide (local, Docker, ECS)
- Kiro MCP configuration guide
- Multi-system configuration examples
- OAuth setup per identity provider (Cognito, Okta, Entra ID)
- Update main README with deployment option matrix

**Files to create/update:**

- `docs/integrations/q-developer.md`
- `docs/integrations/kiro.md`
- `packages/adt-mcp/README.md` — add deployment sections

**Estimated effort:** Small

---

## 9. Priority Summary

| Phase   | Description                       | Priority    | Unlocks                                      |
| ------- | --------------------------------- | ----------- | -------------------------------------------- |
| **P1**  | Streamable HTTP Transport         | 🔴 Critical | Q Developer, Kiro, Docker, Cloud, everything |
| **P2**  | Server-Side Config & Multi-System | 🔴 Critical | Practical Docker/Cloud usage                 |
| **P3**  | Docker MCP Server                 | 🟡 High     | Isolated deployment, team sharing            |
| **P4**  | Credential Provider Framework     | 🟡 High     | Secure credential management                 |
| **P5**  | OAuth / OIDC                      | 🟡 High     | Enterprise multi-user                        |
| **P6**  | Principal Propagation             | 🟠 Medium   | Per-user SAP identity in shared server       |
| **P7**  | Enterprise Middleware             | 🟠 Medium   | Production readiness                         |
| **P8**  | Cloud Deployment Guide            | 🟠 Medium   | Production deployment                        |
| **P9**  | Migration Analysis Tool           | 🟢 Low      | Tool parity completeness                     |
| **P10** | Integration Documentation         | 🟢 Low      | User onboarding                              |

---

## 10. What We Do Better (Advantages to Preserve)

While pursuing feature parity, these strengths must be maintained:

1. **Type-safe XSD→schema→contract pipeline** — the AWS project uses hand-written XML parsing with `xmltodict`/`defusedxml`. Our generated schemas are more correct and maintainable.
2. **90+ tools vs 15** — dramatically broader ADT coverage including DDIC, CDS, BAdI, gCTS, RFC, FLP, PSE management.
3. **Modular architecture** — one file per tool vs monolithic 398KB `sap_client.py`.
4. **Contract-driven client** — full type inference at call sites; the AWS project manually constructs HTTP requests.
5. **Security session protocol** — proper 3-step CSRF flow vs basic token fetch.
6. **Existing CLI parity** — every MCP tool has a matching CLI command with shared service functions.
7. **Test infrastructure** — mock ADT server, integration tests, contract tests.
8. **stdio transport** — remains the best option for Claude Desktop, VS Code, Cursor, Windsurf (the AWS project doesn't support this!).

---

## 11. Risks & Considerations

1. **MCP SDK Streamable HTTP maturity**: The `@modelcontextprotocol/sdk` TypeScript SDK's Streamable HTTP transport is relatively new. Verify stability before committing.
2. **Principal Propagation complexity**: X.509 cert generation and mTLS add significant complexity. Consider if a simpler OAuth → stored-credential approach could suffice initially.
3. **AWS-specific features**: AWS Secrets Manager, ECS Fargate, Cognito are AWS-specific. Consider abstracting for multi-cloud (Azure Key Vault, GCP Secret Manager) or keep AWS-first.
4. **Stateful vs stateless**: Moving from stateless per-call to server-managed sessions is an architectural shift. Ensure backward compatibility with stdio mode.
5. **Dependency footprint**: Adding OAuth/JWT/cert libraries increases the package size. Keep dependencies minimal and optional.

---

## Appendix A: File Structure of AWS ABAP Accelerator

```
src/aws_abap_accelerator/
├── main.py                      # Local entry point (stdio-http bridge)
├── enterprise_main.py           # Enterprise entry point (FastAPI + OAuth + PP)
├── enterprise_main_tools.py     # 15 MCP tools with auth wrappers
├── health_check.py              # Container health check
├── auth/
│   ├── iam_identity_validator.py
│   ├── keychain_manager.py
│   ├── multi_system_manager.py
│   ├── principal_propagation.py
│   ├── principal_propagation_middleware.py
│   ├── sap_auth_helper.py
│   ├── sap_client_factory.py
│   ├── session_manager.py
│   ├── mcp_tools.py              # Auth-specific MCP tools
│   ├── integration.py
│   ├── rbac_manager.py           # Empty (planned)
│   └── providers/
├── config/
│   └── settings.py               # Pydantic settings model
├── enterprise/
│   ├── context_manager.py        # Request context propagation
│   ├── middleware.py              # Enterprise middleware stack
│   ├── sap_client_factory.py     # Per-user client creation
│   └── usage_tracker.py          # Analytics & metrics
├── sap/
│   ├── sap_client.py             # 398KB monolith — all SAP ADT operations
│   ├── cds_handler.py            # CDS DDL generation (56KB)
│   ├── class_handler.py          # Class creation with test support
│   ├── behavior_definition_handler.py
│   ├── service_definition_handler.py
│   ├── service_binding_handler.py
│   └── core/
│       ├── connection.py
│       ├── object_manager.py
│       ├── source_manager.py
│       └── activation_manager.py (empty)
├── server/
│   ├── fastmcp_server.py         # FastMCP server setup
│   ├── fastmcp_oauth_integration.py
│   ├── tool_handlers.py          # Tool dispatch (91KB)
│   ├── health.py
│   ├── middleware.py
│   ├── oauth_callback.py
│   ├── oauth_helpers.py
│   ├── oauth_manager.py
│   └── oidc_discovery.py
├── sap_types/
│   └── sap_types.py              # Pydantic models for SAP objects
└── utils/
    ├── host_credential_manager.py
    ├── logger.py
    ├── response_optimizer.py
    ├── secret_reader.py
    ├── security.py
    └── xml_utils.py
```
