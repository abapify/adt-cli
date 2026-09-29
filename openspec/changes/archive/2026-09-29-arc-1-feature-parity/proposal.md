## Why

ARC-1 (`marianfoo/arc-1`) is a production MCP server for SAP ABAP that has pioneered three high-value capabilities our CLI + MCP still lack: **abaplint-powered local linting**, **context compression** (extracting only the public-API surface of ABAP dependencies to save 7–30× tokens), and **method-level surgical editing** (update one method without touching the entire class). Adopting these capabilities closes the competitive gap and delivers concrete productivity gains for AI-assisted ABAP development.

## What Changes

- **New `adt lint` CLI command** – runs `@abaplint/core` locally on ABAP source (file or piped) and emits errors/warnings with line/column positions. Supports BTP-cloud vs. on-premise rule presets and an optional `--config` flag for custom `abaplint.jsonc`.
- **New `lint_abap` MCP tool** – mirrors the CLI command; accepts raw source and optional rule overrides; supports `lint`, `lint_and_fix`, and `list_rules` actions. Integrates a **pre-write lint gate** that blocks `update_source` when parser errors or cloud-safety violations are detected.
- **New `get_context` MCP tool + `adt context` CLI command** – given an ABAP object (class, interface, function module, CDS view), fetches full source via existing ADT contracts, strips implementation details using `@abaplint/core` AST, and returns only the **public API contracts** of all detected dependencies.
- **Extend `update_source` MCP tool + `adt source write` CLI** – add `editMethod` action: accepts `objectName`, `methodName`, and the replacement method body; fetches full class source, splices in the new method body, then calls the standard update/activate flow.
- **New `get_short_dumps` MCP tool + `adt diagnose dumps` CLI command** – retrieves recent ABAP runtime dumps (short dumps) from the SAP system via the ADT dumps endpoint, with optional user and count filters.
- **New `get_traces` MCP tool + `adt diagnose traces` CLI command** – retrieves ABAP performance traces (hitlist, statements, db accesses) from the ADT traces endpoint.
- **New `get_completions` MCP tool** – requests code completion proposals at a given line/column from the ADT code-completion endpoint (on-premise; not available on BTP).

## Capabilities

### New Capabilities

- `abap-lint`: Local ABAP linting via `@abaplint/core` – lint, lint-and-fix, and list-rules actions; system-aware presets (BTP cloud vs. on-premise); optional pre-write gate in `update_source`.
- `context-compression`: Fetch + strip ABAP dependencies to their public-API surface (class `PUBLIC SECTION` only, interface full source, function signature only, CDS dependency graph). CLI: `adt context`. MCP: `get_context`.
- `method-surgery`: Surgical single-method update on a class without sending the entire source. Extends existing `update_source` / `adt source write` with an `editMethod` action.
- `short-dumps`: Retrieve ABAP runtime error short dumps from SAP. CLI: `adt diagnose dumps`. MCP: `get_short_dumps`.
- `traces`: Retrieve ABAP performance trace data (hitlist, statements, DB accesses). CLI: `adt diagnose traces`. MCP: `get_traces`.
- `code-completion`: Request symbol/keyword completion proposals at a cursor position via the ADT completion endpoint. MCP: `get_completions`.

### Modified Capabilities

- `adt-cli`: New top-level subcommands `lint`, `context`, and `diagnose dumps|traces` added to the Commander.js tree.

## Impact

- **New dependency**: `@abaplint/core` added to `packages/adt-cli` and `packages/adt-mcp` (local linting and AST-based source stripping).
- **Affected packages**: `packages/adt-cli`, `packages/adt-mcp`, `packages/adt-contracts` (new ADT endpoint contracts for dumps, traces, completions), `packages/adt-schemas` (XSD-derived schemas for those endpoints).
- **Parity invariant**: every new CLI command gets a matching MCP tool (and vice versa) per the existing architecture rule.
- **No breaking changes** – all additions are additive; existing tools and commands are unchanged except `update_source` gains an optional new action.
