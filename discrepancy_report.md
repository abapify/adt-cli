# Triangular Consistency Review: Discrepancy Report

**Date**: Omitted to avoid stale report metadata.
**Auditor**: Jules, Senior Solutions Architect
**Project**: abapify / adt-cli
**Scope**: `adt-mcp` (HTTP transport), `adt-client`, and core service dependencies.

---

## UPDATE SPEC
*Features or constraints in the code that are superior to the original design but were never formalized.*

### 1. Contract-Driven Client Architecture
- **Location**: `packages/adt-client/src/client.ts` vs. `openspec/specs/adt-client/spec.md`
- **The Conflict**: The spec defines a high-level, hand-crafted API (`getObject`, `updateObject`). The code implements a "Contract-Based" architecture where `client.adt` exposes raw ADT endpoints derived automatically from XSDs via `speci`.
- **Root Cause Suggestion**: Design evolution. The team realized that maintaining a high-level API for 100+ ADT endpoints was unsustainable and shifted to a generator-driven approach to ensure 100% coverage and type safety.
- **Recommended Fix**: **UPDATE SPEC**. Redefine the `adt-client` specification to center on the Contract-Driven model. Move high-level "business" operations to the ADK (ABAP Development Kit) section of the spec.

### 2. Local-Auth Bridge for MCP
- **Location**: `packages/adt-mcp/src/lib/tools/sap-connect.ts` vs. `openspec/changes/add-mcp-http-transport/specs/adt-mcp/spec.md`
- **The Conflict**: The implementation of `sap_connect` supports resolving system credentials from the `~/.adt` session store (Priority C). The spec only defines `baseUrl` and `systemId` (via server-side config).
- **Root Cause Suggestion**: "Superior" shortcut. Developers added support for local session reuse to make the MCP server easier to use in local dev environments (e.g., Cursor/VS Code) without re-entering passwords.
- **Recommended Fix**: **UPDATE SPEC**. Formalize the `~/.adt` session store as a valid resolution path for the `sap_connect` tool.

---

## UPDATE DOCUMENTATION
*Logic that exists in the code but is missing or incorrectly described in the manuals.*

### 1. HTTP Transport "Stealth" Mode
- **Location**: `packages/adt-mcp/src/lib/http/server.ts` vs. `website/docs/mcp/overview.md`
- **The Conflict**: User documentation explicitly states: "The transport is always stdio — no HTTP port, no daemon." However, the code contains a full `StreamableHTTPServerTransport` implementation with session management, OAuth, and CORS.
- **Root Cause Suggestion**: Documentation lag. The HTTP transport was implemented as part of a "Wave" that is code-complete but hasn't had its docs promoted to the public site yet.
- **Recommended Fix**: **UPDATE DOCUMENTATION**. Publish the "Streamable HTTP" guide. Explain the `Mcp-Session-Id` requirement and the `sap_connect` lifecycle.

### 2. 3-Step CSRF Handshake Invisibility
- **Location**: `packages/adt-client/src/adapter.ts` vs. `website/docs/architecture/overview.md`
- **The Conflict**: The architectural docs mention CSRF tokens but don't detail the mandatory 3-step security session handshake (Create Session -> Fetch Token -> Delete Session) required by SAP for lock binding. This is correctly implemented in the `SessionManager` but undocumented.
- **Root Cause Suggestion**: Design oversight. The complexity of the SAP handshake was "solved" in code, and the documentation was left at a high level.
- **Recommended Fix**: **UPDATE DOCUMENTATION**. Add a "Security Session Protocol" section to the architecture docs to aid future transport implementers (e.g., if adding Python/Go clients).

### 3. Change-Tracking (ETag) Management
- **Location**: `packages/adt-client/src/adapter.ts` vs. `website/docs/sdk/packages/adt-client.md`
- **The Conflict**: The client implementation features an automated ETag cache/refresh mechanism to prevent "lost updates" (Optimistic Concurrency Control). Consuming developers aren't told they need to use `clearETag()` after certain out-of-band operations.
- **Root Cause Suggestion**: Documentation rot. The ETag logic was hardened recently, but the SDK guide hasn't been updated to reflect the `clearETag` API.
- **Recommended Fix**: **UPDATE DOCUMENTATION**. Update the SDK guide to explain the ETag lifecycle and when manual cache clearing is required.

---

## REFACTOR CODE
*Implementation violates core architectural patterns defined in the spec.*

### 1. MCP "Thin Adapter" Violation
- **Location**: `packages/adt-mcp/src/lib/tools/sap-connect.ts`
- **The Conflict**: The `AGENTS.md` and `overview.md` define the MCP server as a "thin adapter". However, `sap_connect` contains significant branching logic for client resolution and verification.
- **Root Cause Suggestion**: Shortcut in coding. It was easier to implement the resolution logic directly in the tool handler than to create a dedicated `ConnectionService` in `adt-cli` or `adt-client`.
- **Recommended Fix**: **REFACTOR CODE**. Move the client resolution logic (Priority A/B/C) into a reusable service in `@abapify/adt-cli`. The MCP tool should simply call `ConnectionService.resolve(args)`.

### 2. Parity Invariant Violation (`sap_connect`)
- **Location**: `packages/adt-mcp/src/lib/tools/index.ts`
- **The Conflict**: `AGENTS.md` states: "Every CLI subcommand has a matching MCP tool, and every MCP tool has a matching CLI subcommand." The `sap_connect` and `sap_disconnect` tools have no CLI equivalent.
- **Root Cause Suggestion**: Design mismatch. These tools were viewed as "transport-specific" (HTTP only), but the invariant is stated as a global monorepo rule.
- **Recommended Fix**: **REFACTOR CODE** (or **UPDATE SPEC**). Either implement `adt auth connect/disconnect` (which would update the local session store) or explicitly exempt lifecycle tools from the parity invariant in `AGENTS.md`.

### 3. Dependency Leak (`adt-cli` in `adt-mcp` tools)
- **Location**: `packages/adt-mcp/src/lib/tools/sap-connect.ts`
- **The Conflict**: The tool imports `getAdtClientV2Safe` directly from `@abapify/adt-cli`. While `adt-mcp` is allowed to depend on `adt-cli`, tools are ideally supposed to depend on the *service layer*, not internal utility functions.
- **Root Cause Suggestion**: Shortcut in coding.
- **Recommended Fix**: **REFACTOR CODE**. Ensure all tools use the service exports from `adt-cli/src/index.ts` rather than reaching into deep library paths.
