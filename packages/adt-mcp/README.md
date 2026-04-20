# @abapify/adt-mcp

MCP (Model Context Protocol) server that exposes SAP ADT operations as structured tools for AI assistants, IDE integrations, and automation pipelines.

This package ships **two transports**:

| Binary         | Transport                   | State model                                               |
| -------------- | --------------------------- | --------------------------------------------------------- |
| `adt-mcp`      | stdio (JSON-RPC over pipes) | Stateless — connection-per-call.                          |
| `adt-mcp-http` | Streamable HTTP             | Session-scoped cached `AdtClient`, locks, and changesets. |

See [`docs/deployment/mcp-http.md`](../../docs/deployment/mcp-http.md) for the complete HTTP deployment guide (Docker, Okta, multi-system, troubleshooting). The rest of this README focuses on stdio.

## Quick Start (stdio)

```bash
# Run via npx (no install required)
npx @abapify/adt-mcp
```

### Configure in Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or the equivalent path on your OS:

```json
{
  "mcpServers": {
    "adt": {
      "command": "npx",
      "args": ["@abapify/adt-mcp"]
    }
  }
}
```

### Configure in VS Code (GitHub Copilot agent mode)

Add to `.vscode/mcp.json` in your workspace, or to your user settings under `"mcp"`:

```json
{
  "servers": {
    "adt": {
      "type": "stdio",
      "command": "npx",
      "args": ["@abapify/adt-mcp"]
    }
  }
}
```

### Configure in Cursor / Windsurf

Add to your MCP server list:

```json
{
  "mcpServers": {
    "adt": {
      "command": "npx",
      "args": ["@abapify/adt-mcp"]
    }
  }
}
```

---

## HTTP transport (since Wave 1)

`adt-mcp-http` is the Streamable HTTP entry-point. It targets shared / remote deployments (Docker, Kubernetes, Kiro, teams).

Minimal run:

```bash
bunx nx build adt-mcp
node packages/adt-mcp/dist/bin/adt-mcp-http.mjs --port 3000 --auth-token "$(openssl rand -hex 32)"
```

Minimal smoke test:

```bash
TOKEN=<your token>
curl -sf http://127.0.0.1:3000/healthz
curl -H "Authorization: Bearer $TOKEN" \
     -H 'Content-Type: application/json' \
     -X POST http://127.0.0.1:3000/mcp \
     -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"demo","version":"0"}}}'
```

Capture the `Mcp-Session-Id` response header, then call `sap_connect`, the tools you need, and finally `sap_disconnect` — or close the transport to trigger cleanup automatically.

**Auth modes:** `none` (dev / loopback), `bearer` (shared secret), `proxy` (trust `x-forwarded-user` from an upstream proxy), `oauth` (OIDC JWT validation against Okta / Entra ID / Cognito). Full flag + env matrix in [`docs/deployment/mcp-http.md`](../../docs/deployment/mcp-http.md#cli-reference).

### Session lifecycle tools

Only available on the HTTP transport:

| Tool             | Purpose                                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sap_connect`    | Perform the SAP security-session handshake once per MCP session. Accepts inline credentials or a `systemId` resolved against `SAP_SYSTEMS_JSON` / `SAP_SYSTEMS_FILE`. |
| `sap_disconnect` | Release locks, DELETE the SAP security session, and drop the cached client.                                                                                           |

### Transactional changesets (since Wave 3)

Bundle multiple ADT writes into a single atomic unit:

| Tool                 | Purpose                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `changeset_begin`    | Open a transactional unit-of-work bound to the current MCP session (one at a time).                                          |
| `changeset_add`      | Stage an object write — acquires a lock and PUTs the supplied source. Defers activate.                                       |
| `changeset_commit`   | Batch-activate every staged object in a single call, then release all locks.                                                 |
| `changeset_rollback` | Release every held lock and mark the changeset rolled back. Source PUTs are not reverted (SAP has no transactional discard). |

See [`docs/deployment/mcp-http.md#transactional-changesets`](../../docs/deployment/mcp-http.md#transactional-changesets) for a worked example.

---

## Connection Parameters

Every tool requires these connection parameters (passed per-call, never stored):

| Parameter  | Type   | Required | Description                                                    |
| ---------- | ------ | -------- | -------------------------------------------------------------- |
| `baseUrl`  | string | ✅       | SAP system base URL, e.g. `https://my-system.example.com:8000` |
| `client`   | string | —        | SAP client number, e.g. `100`                                  |
| `username` | string | —        | Username for basic auth                                        |
| `password` | string | —        | Password for basic auth                                        |

> **Security note:** credentials are forwarded directly to the SAP system per request. The MCP server holds no state and persists no credentials.

---

## Tools Reference

### Discovery & System

#### `discovery`

Discover available ADT services on the SAP system. Useful for checking what endpoints the system supports before using other tools.

**Parameters:** connection only

**Returns:** JSON object with available service collections and their links.

---

#### `system_info`

Get SAP system and/or session information.

**Parameters:**

| Parameter | Type                                  | Default  | Description                  |
| --------- | ------------------------------------- | -------- | ---------------------------- |
| `scope`   | `"session"` \| `"system"` \| `"both"` | `"both"` | What information to retrieve |

**Returns:**

```json
{
  "session": { "user": "DEVELOPER", "client": "100", "language": "EN", ... },
  "system": { "systemId": "DEV", "release": "757", ... }
}
```

---

### Object Repository

#### `search_objects`

Search for ABAP objects in the repository. Supports wildcards.

**Parameters:**

| Parameter    | Type   | Default | Description                             |
| ------------ | ------ | ------- | --------------------------------------- |
| `query`      | string | ✅      | Search term, e.g. `ZCL_*` or `MY_CLASS` |
| `maxResults` | number | `50`    | Maximum number of results               |

**Returns:**

```json
{
  "count": 3,
  "objects": [
    { "name": "ZCL_MY_CLASS", "type": "CLAS/OC", "uri": "/sap/bc/adt/oo/classes/zcl_my_class", ... }
  ]
}
```

---

#### `get_object`

Get details about a specific ABAP object by name. Performs an exact-match search and returns the object metadata plus a list of similar objects if no exact match is found.

**Parameters:**

| Parameter    | Type   | Description                 |
| ------------ | ------ | --------------------------- |
| `objectName` | string | ABAP object name to look up |

**Returns:**

```json
{ "found": true, "object": { "name": "ZCL_MY_CLASS", "type": "CLAS/OC", "uri": "...", ... } }
```

or, when not found:

```json
{ "found": false, "message": "Object 'FOO' not found", "similar": [...] }
```

---

### Source Code

#### `get_source`

Fetch the raw ABAP source code for a program, class, interface, or function group.

**Parameters:**

| Parameter    | Type    | Description                                                                              |
| ------------ | ------- | ---------------------------------------------------------------------------------------- |
| `objectName` | string  | ABAP object name                                                                         |
| `objectType` | string? | Object type hint (`PROG`, `CLAS`, `INTF`, …). Skips the search round-trip when provided. |

**Returns:** Plain ABAP source text.

**Tip:** Always pass `objectType` when you already know it — it saves one network round-trip.

---

#### `update_source`

Write new ABAP source code to an existing object. Internally performs the full SAP ADT lock→PUT→unlock cycle.

**Parameters:**

| Parameter    | Type    | Description                                                   |
| ------------ | ------- | ------------------------------------------------------------- |
| `objectName` | string  | ABAP object name                                              |
| `objectType` | string? | Object type hint                                              |
| `sourceCode` | string  | New ABAP source code                                          |
| `transport`  | string? | Transport request number (required for transportable objects) |

**Returns:**

```json
{ "status": "updated", "object": "ZCL_MY_CLASS" }
```

> ⚠️ **Always activate after updating** — inactive source is not compiled and cannot be executed.

---

#### `get_test_classes`

Retrieve the test class definitions (`FOR TESTING`) embedded in an ABAP class. Returns the raw source of the testclasses include.

**Parameters:**

| Parameter   | Type   | Description                          |
| ----------- | ------ | ------------------------------------ |
| `className` | string | ABAP class name, e.g. `ZCL_MY_CLASS` |

**Returns:** Plain ABAP source of the local test class include.

---

### Activation & Syntax

#### `activate_object`

Activate one or more ABAP objects. Supports single-object and batch modes.

**Single object mode:**

| Parameter    | Type   | Description                             |
| ------------ | ------ | --------------------------------------- |
| `objectName` | string | ABAP object name                        |
| `objectType` | string | Object type (`PROG`, `CLAS`, `INTF`, …) |

**Batch mode:**

| Parameter | Type                              | Description                        |
| --------- | --------------------------------- | ---------------------------------- |
| `objects` | `Array<{objectName, objectType}>` | Objects to activate in one request |

**Returns:**

```json
{ "status": "activated", "count": 2, "objects": [{ "name": "ZCL_FOO", "type": "CLAS" }, ...] }
```

---

#### `check_syntax`

Run an ABAP syntax check on an object and return structured check messages. Uses the `checkrun` schema — no XML parsing in tool code.

**Parameters:**

| Parameter    | Type                                  | Default    | Description                            |
| ------------ | ------------------------------------- | ---------- | -------------------------------------- |
| `objectName` | string                                | ✅         | ABAP object name                       |
| `objectType` | string?                               | —          | Object type hint for faster resolution |
| `version`    | `"active"` \| `"inactive"` \| `"new"` | `"active"` | Version to check                       |

**Returns:**

```json
{
  "hasErrors": false,
  "hasWarnings": true,
  "reports": [
    {
      "reporter": "syntax",
      "triggeringUri": "/sap/bc/adt/oo/classes/zcl_foo",
      "checkMessageList": {
        "checkMessage": [{ "type": "W", "shortText": "Variable X is unused", ... }]
      }
    }
  ]
}
```

---

### Unit Testing

#### `run_unit_tests`

Run ABAP Unit tests on an object or package and receive pass/fail counts broken down by test method.

**Parameters:**

| Parameter      | Type    | Default | Description                              |
| -------------- | ------- | ------- | ---------------------------------------- |
| `objectName`   | string  | ✅      | Object name (class, program, or package) |
| `objectType`   | string? | —       | Type hint (`CLAS`, `PROG`, `DEVC`, …)    |
| `withCoverage` | boolean | `false` | Whether to collect code coverage data    |

**Returns:**

```json
{
  "totalTests": 5,
  "passCount": 4,
  "failCount": 1,
  "errorCount": 0,
  "programs": [ ... ]
}
```

---

### Package Management

#### `list_package_objects`

List ABAP objects contained in a package. Uses `quickSearch` with a `packageName` filter.

**Parameters:**

| Parameter     | Type    | Default | Description                        |
| ------------- | ------- | ------- | ---------------------------------- |
| `packageName` | string  | ✅      | Package name, e.g. `ZPACKAGE`      |
| `objectType`  | string? | —       | Filter by type (`CLAS`, `PROG`, …) |
| `maxResults`  | number  | `200`   | Maximum result count               |

**Returns:**

```json
{
  "packageName": "ZPACKAGE",
  "count": 12,
  "objects": [{ "name": "ZCL_FOO", "type": "CLAS/OC", ... }]
}
```

---

### Change & Transport System (CTS)

#### `cts_list_transports`

List transport requests from the CTS.

**Parameters:**

| Parameter    | Type   | Default |
| ------------ | ------ | ------- |
| `maxResults` | number | `50`    |

**Returns:** Array of transport request descriptors.

---

#### `cts_get_transport`

Get details for a specific transport request.

**Parameters:**

| Parameter     | Type   | Description                         |
| ------------- | ------ | ----------------------------------- |
| `transportId` | string | Transport number, e.g. `DEVK900001` |

**Returns:** Full transport descriptor including tasks and objects.

---

#### `cts_create_transport`

Create a new transport request.

**Parameters:**

| Parameter     | Type           | Default | Description                          |
| ------------- | -------------- | ------- | ------------------------------------ |
| `description` | string         | ✅      | Transport description                |
| `type`        | `"K"` \| `"W"` | `"K"`   | Workbench (`K`) or Customizing (`W`) |

> 🚧 Not yet implemented — returns a clear error until the underlying client method is available.

---

#### `cts_release_transport`

Release a transport request.

**Parameters:**

| Parameter     | Type   | Description      |
| ------------- | ------ | ---------------- |
| `transportId` | string | Transport number |

> 🚧 Not yet implemented.

---

#### `cts_delete_transport`

Delete a transport request.

**Parameters:**

| Parameter     | Type   | Description      |
| ------------- | ------ | ---------------- |
| `transportId` | string | Transport number |

---

### ABAP Test Cockpit (ATC)

#### `atc_run`

Run ABAP Test Cockpit checks on an object or package and return the resulting findings worklist.

**Parameters:**

| Parameter   | Type   | Description                                                 |
| ----------- | ------ | ----------------------------------------------------------- |
| `objectUri` | string | ADT URI of the target, e.g. `/sap/bc/adt/packages/ZPACKAGE` |

**Returns:**

```json
{ "status": "completed", "worklist": { ... } }
```

---

## Common Workflows

### Read → Edit → Save → Activate

```
1. get_source      objectName=ZCL_FOO objectType=CLAS
2. update_source   objectName=ZCL_FOO objectType=CLAS sourceCode="..." transport=DEVK900001
3. check_syntax    objectName=ZCL_FOO objectType=CLAS version=inactive
4. activate_object objectName=ZCL_FOO objectType=CLAS
5. run_unit_tests  objectName=ZCL_FOO objectType=CLAS
```

### Explore a Package

```
1. list_package_objects packageName=ZPACKAGE
2. get_object      objectName=ZCL_FOO
3. get_source      objectName=ZCL_FOO objectType=CLAS
```

### Quality Gate

```
1. check_syntax objectName=ZCL_FOO objectType=CLAS
2. atc_run      objectUri=/sap/bc/adt/oo/classes/zcl_foo
3. run_unit_tests objectName=ZCL_FOO objectType=CLAS
```

---

## Architecture

```
┌──────────────┐    stdio (JSON-RPC)   ┌──────────────────────────────┐
│  MCP Client  │ ◄───────────────────► │  @abapify/adt-mcp            │
│ (AI / IDE)   │                       │  McpServer (17 tools)        │
└──────────────┘                       └──────────────┬───────────────┘
                                                      │ calls
                                       ┌──────────────▼───────────────┐
                                       │  @abapify/adt-client         │
                                       │  (typed contracts via speci) │
                                       └──────────────┬───────────────┘
                                                      │ HTTP/HTTPS
                                       ┌──────────────▼───────────────┐
                                       │  SAP System (ADT REST)       │
                                       └──────────────────────────────┘
```

**Design principles:**

- **No logic duplication** – tools delegate to `@abapify/adt-client` services.
- **Schema-based serialisation** – request/response XML is handled via typed schemas from `@abapify/adt-schemas`. No manual XML building, no third-party XML parser.
- **Structured JSON** – every tool returns JSON, never raw console output.
- **Zod validation** – all tool inputs are validated before reaching the SAP system.
- **Connection-per-call** – each tool call creates its own ADT client; the server is stateless.

---

## Programmatic Usage

```typescript
import { createMcpServer } from '@abapify/adt-mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = createMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Custom client factory (e.g. for testing or SSO)

```typescript
import { createMcpServer } from '@abapify/adt-mcp';

const server = createMcpServer({
  clientFactory: (params) =>
    createAdtClient({
      baseUrl: params.baseUrl,
      username: params.username ?? '',
      password: params.password ?? '',
      client: params.client,
    }),
});
```

---

## Testing

Integration tests use Node.js native test runner (`node:test`) and a built-in mock ADT server that needs no SAP system.

```bash
# Run all integration tests
cd packages/adt-mcp
node --test --import tsx tests/integration.test.ts
```

### Using the mock server in your own tests

```typescript
import { createMockAdtServer } from '@abapify/adt-mcp/mock';

const mock = createMockAdtServer();
const { port } = await mock.start();
// ... test against http://localhost:${port}
await mock.stop();
```

---

## Development

```bash
bunx nx build adt-mcp      # build
bunx nx typecheck adt-mcp  # type check
bunx nx lint adt-mcp       # lint
bunx nx test adt-mcp       # tests (runs integration suite)
```

---

## Feature Parity Map

| CLI Command            | MCP Tool                | Status     |
| ---------------------- | ----------------------- | ---------- |
| `adt discovery`        | `discovery`             | ✅         |
| `adt info`             | `system_info`           | ✅         |
| `adt search`           | `search_objects`        | ✅         |
| `adt get`              | `get_object`            | ✅         |
| `adt source get`       | `get_source`            | ✅         |
| `adt source put`       | `update_source`         | ✅         |
| `adt activate`         | `activate_object`       | ✅         |
| `adt check`            | `check_syntax`          | ✅         |
| `adt aunit run`        | `run_unit_tests`        | ✅         |
| `adt atc run`          | `atc_run`               | ✅         |
| `adt cts tr list`      | `cts_list_transports`   | ✅         |
| `adt cts tr get`       | `cts_get_transport`     | ✅         |
| `adt cts tr delete`    | `cts_delete_transport`  | ✅         |
| `adt cts tr create`    | `cts_create_transport`  | 🚧 Not yet |
| `adt cts tr release`   | `cts_release_transport` | 🚧 Not yet |
| `adt ls`               | —                       | 🔜 Future  |
| `adt cts search`       | —                       | 🔜 Future  |
| `adt import package`   | —                       | 🔜 Future  |
| `adt import transport` | —                       | 🔜 Future  |
