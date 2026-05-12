## Context

`adt-cli` and `adt-mcp` already cover a wide surface of the SAP ADT REST API (source read/write, syntax check, ATC, unit tests, CTS, DDIC, search, navigation). ARC-1 (`marianfoo/arc-1`) has proven three high-value patterns not yet present in this codebase:

1. **Local abaplint linting** — `@abaplint/core` parses ABAP source offline and emits typed diagnostics. Gives instant feedback without an SAP round-trip and can serve as a pre-write gate.
2. **Context compression** — fetch full source of each dependency via existing ADT contracts, then use the `@abaplint/core` AST to strip everything except the public API surface (class `PUBLIC SECTION`, interface verbatim, function-module signature only, CDS dependency graph). Saves 7–30× tokens for LLM context.
3. **Method surgery** — fetch the full class source, splice in a replacement method body, then write back with the existing lock/PUT/unlock flow. Reduces token cost of iterative edits by ~95%.

Two more capabilities fill remaining diagnostic gaps: **short dumps** (ABAP runtime errors, ADT `/sap/bc/adt/runtime/dumps`) and **performance traces** (ADT `/sap/bc/adt/runtime/traces`). And **code completion** at a cursor position is available via ADT `/sap/bc/adt/codeassistance/completion` on on-premise systems.

All additions must maintain the **CLI ↔ MCP parity invariant** and follow the contract-first architecture.

## Goals / Non-Goals

**Goals:**

- Add `adt lint` CLI command and `lint_abap` MCP tool backed by `@abaplint/core`.
- Add optional pre-write lint gate in `update_source` / `adt source write`.
- Add `adt context` CLI command and `get_context` MCP tool for context compression via AST stripping.
- Extend `update_source` / `adt source write` with an `editMethod` action for method surgery.
- Add `adt diagnose dumps` CLI and `get_short_dumps` MCP tool.
- Add `adt diagnose traces` CLI and `get_traces` MCP tool.
- Add `get_completions` MCP tool (MCP-only for now; no CLI equivalent due to cursor-position UX mismatch).
- Register new ADT endpoint contracts in `adt-contracts` and schemas in `adt-schemas` for dumps, traces, and completions.

**Non-Goals:**

- Object cache warm-up / persistent caching layer (ARC-1 uses SQLite; we use stateless ADT calls per the existing architecture).
- `usages` (reverse dependency lookup) in `get_context` — this requires cache warm-up, out of scope.
- `batch_create` / `batch_activate` — already covered by `changeset_*` tools in our MCP.
- SAP BTP principal propagation / XSUAA — existing auth layer unchanged.
- abaplint rule auto-fix for `SAPWrite` pre-write gate — only block on parse/cloud errors.

## Decisions

### D1: abaplint as a shared service library

Linting and AST stripping both need `@abaplint/core`. Rather than duplicating the logic in `adt-cli` and `adt-mcp`, extract it to a new `packages/adt-lint` library (zero SAP deps). Both CLI and MCP depend on it. This mirrors how `adt-locks` and `adk` are already shared.

**Alternatives considered:**

- Inline in `adt-mcp` only — breaks parity; CLI has no lint.
- Inline separately in both — code duplication, drift risk.

### D2: AST stripping via @abaplint/core (not regex)

Context compression strips `CLASS IMPLEMENTATION` blocks and `PROTECTED`/`PRIVATE` sections. A regex approach is fragile for nested structures (e.g. inline methods). `@abaplint/core` provides a proper AST with statement position ranges, making precise extraction reliable.

**Alternatives considered:**

- Regex + line-range splicing — simpler but fragile; rejected.
- Separate XSD contract for a "definitions-only" endpoint — no such ADT endpoint exists.

### D3: Method surgery as a new `action` in `update_source`

Rather than a separate `patch_method` tool, method surgery is an additional `action: "editMethod"` on the existing `update_source` tool (and a `--method` flag on `adt source write`). This keeps the tool count low and the mental model simple.

**Alternatives considered:**

- New `patch_method` tool — proliferates tool count; rejected.
- Full-class replace always — defeats the 95% token saving; rejected.

### D4: Dumps and traces via raw `client.fetch` (no new XSD schemas initially)

The ADT runtime dump and trace endpoints return XML with undocumented schemas that vary across releases. Rather than generating brittle XSD schemas, the initial implementation uses `client.fetch` with `Accept: application/json` (where supported) or minimal XML extraction for key fields (id, type, user, timestamp, text). Schema contracts can be promoted later.

**Alternatives considered:**

- Full XSD schema generation — would require real-system capture; deferred.
- Skip entirely — blocks diagnostic parity; rejected.

### D5: Code completion is MCP-only

`get_completions` requires `line`/`column` cursor positions which have no natural representation in a terminal CLI workflow. The MCP use case (LLM cursor-aware editing) is clear; the CLI use case is not.

**Alternatives considered:**

- Add `adt complete` CLI command — unclear UX without LSP integration; deferred.

### D6: Pre-write lint gate is opt-in via `--lint-before-write` / `lintBeforeWrite` tool flag

Not all systems are cloud ABAP; some users want to bypass the gate. Following ARC-1's pattern, the gate defaults to `false` and must be explicitly enabled. Only parser errors and cloud-type violations block the write.

## Risks / Trade-offs

- **`@abaplint/core` bundle size** — adds ~2–5 MB to `adt-lint`. [Risk] Tree-shaking may not be effective for the core parser. → Mitigation: lazy-load / dynamic import; measure bundle before shipping.
- **AST stripping accuracy** — `@abaplint/core` may not parse all ABAP dialects (macros, include forms). [Risk] Stripping produces malformed output on edge cases. → Mitigation: strip operation falls back to returning full source if AST parse fails.
- **Dump/trace endpoint availability** — `/sap/bc/adt/runtime/dumps` is available on NetWeaver 7.50+ but not on BTP. [Risk] Tool fails on BTP with 404. → Mitigation: graceful error message indicating BTP limitation.
- **Method surgery cursor errors** — finding the method boundary in the AST requires the method to already exist. [Risk] Editing a non-existent method causes confusing errors. → Mitigation: explicit validation step; return `isError: true` with clear message.

## Migration Plan

All changes are purely additive:

1. Add `packages/adt-lint` library (new package, no consumers yet).
2. Add `@abapify/adt-lint` dependency to `packages/adt-cli` and `packages/adt-mcp`.
3. Register new tools in `packages/adt-mcp/src/lib/tools/index.ts`.
4. Add new CLI commands to `packages/adt-cli/src/lib/commands/`.
5. Add new ADT contracts in `packages/adt-contracts` for dumps, traces, completions.
6. No removals; no breaking changes; no migrations required.

## Open Questions

- OQ1: Should `get_context` support `FUNC` (function modules) in the initial cut, or only `CLAS`, `INTF`, `PROG`, `DDLS`?
- OQ2: Should the abaplint preset (cloud vs. on-premise) be auto-detected from the system info endpoint, or always require an explicit `--btp` flag?
- OQ3: Exact shape of the dumps/traces API response — needs a captured real-system fixture before contract promotion.
