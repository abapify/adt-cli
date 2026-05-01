## Context

The repo already has a fully-featured `@abapify/adt-mcp` MCP server that exposes all ADT operations as MCP tools (`atc_run`, `cts_list_transports`, `list_package_objects`, etc.). Mastra AI provides a first-class `MCPClient` integration that lets an `Agent` call those tools natively. The goal is to compose these two pieces into a standalone `@abapify/adt-pilot` package without duplicating any ADT logic.

## Goals / Non-Goals

**Goals:**

- New Nx publishable library `packages/adt-pilot` (`@abapify/adt-pilot`)
- Mastra `Harness` with a single agent mode: **review**
- `codeReviewWorkflow`: a `createWorkflow` workflow with two input paths:
  - **Package mode** (`mode: 'package'`, `packageName: string`) — calls `list_package_objects` then `atc_run` per object
  - **Transport mode** (`mode: 'transport'`, `transportNumber: string`) — calls `cts_get_transport` to resolve objects then `atc_run` per object
- Structured output: `CodeReviewReport` (`{ mode, target, findings[], summary }`).
- 100% Vitest test coverage via `@abapify/adt-fixtures` mock server.

**Non-Goals:**

- UI / TUI frontend (Harness is wired but no terminal renderer shipped in this change)
- LLM-generated natural-language summaries (the agent returns structured JSON findings; an LLM layer can be added later)
- Modifying any existing package

## Decisions

### 1. Package as a separate Nx library, not a sample

**Decision**: `packages/adt-pilot` (publishable `@abapify/adt-pilot`).  
**Rationale**: Makes the agent installable as a dependency, keeps it tested in CI like the rest of the monorepo, and follows the same package structure as `adt-mcp`.  
**Alternative considered**: Add inside `samples/` — rejected because samples are not covered by the main CI test matrix and cannot be depended upon.

### 2. Mastra MCP wiring via `MCPClient` in-process

**Decision**: Use `@mastra/mcp`'s `MCPClient` with `InMemoryTransport` to connect to an in-process `@abapify/adt-mcp` server in tests; use `StdioServerParameters` to spawn the real binary in production.  
**Rationale**: Avoids network overhead in tests; matches the pattern used by other Mastra-based agents. In production the pilot receives `baseUrl/username/password` as workflow input and passes them as tool arguments — no session state needed.  
**Alternative considered**: Call ADT client directly without MCP — rejected because it would duplicate the tool layer and break the `adt-mcp ↔ adt-cli` parity invariant.

### 3. Workflow over pure Agent for code review

**Decision**: `codeReviewWorkflow` is a `createWorkflow` chain of typed steps rather than a freeform agent loop.  
**Rationale**: Deterministic output schema, easier to test step-by-step, no LLM required for the core logic. The `Harness` wraps the workflow so an LLM can be plugged in later.  
**Steps**:

1. `resolveObjects` — call `list_package_objects` or `cts_get_transport` to get the list of objects
2. `runAtcChecks` — call `atc_run` for each object (sequential or parallel configurable)
3. `buildReport` — aggregate findings into `CodeReviewReport`

### 4. `@mastra/mcp` for tool binding

**Decision**: Add `@mastra/mcp` as a direct dependency (not `@mastra/core` alone) because `MCPClient` lives there.  
**Rationale**: Keeps the dependency surface minimal; `@mastra/core` is a peer dep of `@mastra/mcp`.

### 5. No LLM key required for tests

**Decision**: Workflow steps execute deterministically (no LLM calls); tests use the fixture mock server. The Harness agent mode is configured with a placeholder model string and is not exercised in unit/integration tests.  
**Rationale**: Keeps CI independent of external API keys.

## Risks / Trade-offs

- **`@mastra/core` API churn** — Mastra is on v1 with frequent releases. The workflow/step API used here (`createWorkflow`, `createStep`) is the stable "v-next" surface. Pin to a minor version range.  
  → Mitigation: snapshot the version in `package.json` as `"^1.28.0"`.

- **Large transitive dependency graph** — `@mastra/core` pulls in `hono`, `ai`, `ajv`, etc.  
  → Mitigation: `adt-pilot` is a standalone package; it does not affect the bundle of `adt-cli` or `adt-mcp`.

## Migration Plan

No migration required — new package only. Deploy by publishing `@abapify/adt-pilot` independently.

## Open Questions

- Should `codeReviewWorkflow` run ATC checks in parallel per object? Default: sequential (safe); a `parallel` flag can be added later.
