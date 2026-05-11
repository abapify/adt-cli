## 1. Foundation — `packages/adt-lint` shared library

- [x] 1.1 Scaffold `packages/adt-lint` package (tsdown build, Vitest, package.json with `@abapify/adt-lint` name)
- [x] 1.2 Add `@abaplint/core` as a dependency to `packages/adt-lint`; verify advisory database for known CVEs
- [x] 1.3 Implement `lintSource(source, options)` — run `@abaplint/core` rules and return typed `LintDiagnostic[]`
- [x] 1.4 Implement `lintAndFix(source, options)` — run lint with auto-fix and return `{ source: string; remaining: LintDiagnostic[] }`
- [x] 1.5 Implement `listRules(options)` — return all rule names with enabled status and current config
- [x] 1.6 Implement `stripToPublicApi(source, objectType)` — use `@abaplint/core` AST to strip class implementation / private/protected sections, function body, etc.; fall back to full source on parse failure
- [x] 1.7 Implement `extractDependencies(source)` — AST scan for `TYPE REF TO`, `NEW`, `CAST`, `INHERITING FROM`, `INTERFACES`, `CALL FUNCTION`, `RAISING`, `CATCH`, `=>` references; return Z/Y names only
- [x] 1.8 Implement `detectMethodBoundary(source, methodName)` — line scan + AST fallback; return `{ startLine, endLine }` or `null`
- [x] 1.9 Export `buildPreset(systemType: "btp" | "onpremise")` returning abaplint config object for the appropriate rule set
- [x] 1.10 Write unit tests for `lintSource`, `lintAndFix`, `stripToPublicApi`, `extractDependencies`, `detectMethodBoundary` using fixture ABAP source strings
- [x] 1.11 Run `bunx nx build adt-lint && bunx nx test adt-lint && bunx nx lint adt-lint`

## 2. ADT Contracts — dumps, traces, completions

- [x] 2.1 Capture (or mock-capture) the ADT dumps endpoint response shape; create `packages/adt-contracts/src/adt/runtime/dumps.ts` contract
- [x] 2.2 Capture (or mock-capture) the ADT traces endpoint response shape; create `packages/adt-contracts/src/adt/runtime/traces.ts` contract
- [x] 2.3 Create `packages/adt-contracts/src/adt/codeassistance/completion.ts` contract for `GET /sap/bc/adt/codeassistance/completion`
- [x] 2.4 Export new contracts from `packages/adt-contracts/src/index.ts`
- [x] 2.5 Run `bunx nx build adt-contracts && bunx nx test adt-contracts`

## 3. MCP tools — `packages/adt-mcp`

- [x] 3.1 Add `@abapify/adt-lint` dependency to `packages/adt-mcp/package.json`
- [x] 3.2 Create `packages/adt-mcp/src/lib/tools/lint-abap.ts` — implement `lint_abap` tool with `action` (`lint` | `lint_and_fix` | `list_rules`), `source`, `objectName`, `ruleOverrides`, `lintPreset`; delegate to `adt-lint`
- [x] 3.3 Create `packages/adt-mcp/src/lib/tools/get-context.ts` — implement `get_context` tool; resolve object URI, fetch source, call `extractDependencies`, fetch each dep source, call `stripToPublicApi`, return compressed payload
- [x] 3.4 Extend `packages/adt-mcp/src/lib/tools/update-source.ts` — add optional `action: "editMethod"` + `methodName` params; if `editMethod`, fetch source, call `detectMethodBoundary`, splice, write back
- [x] 3.5 Add `lintBeforeWrite` optional param to `update_source`; call `lintSource` with blocking-only rules before write when flag is set
- [x] 3.6 Create `packages/adt-mcp/src/lib/tools/get-short-dumps.ts` — implement `get_short_dumps` tool using dumps contract or raw `client.fetch`
- [x] 3.7 Create `packages/adt-mcp/src/lib/tools/get-traces.ts` — implement `get_traces` tool with `action` (`list` | `hitlist` | `dbAccesses`) using traces contract or raw `client.fetch`
- [x] 3.8 Create `packages/adt-mcp/src/lib/tools/get-completions.ts` — implement `get_completions` tool using completion contract
- [x] 3.9 Register all new tools in `packages/adt-mcp/src/lib/tools/index.ts`
- [x] 3.10 Add parity tests in `packages/adt-cli/tests/e2e/parity.arc1.test.ts` for `lint_abap`, `get_context`, `get_short_dumps`, `get_traces`, `get_completions`
- [x] 3.11 Run `bunx nx build adt-mcp && bunx nx test adt-mcp && bunx nx lint adt-mcp`

## 4. CLI commands — `packages/adt-cli`

- [x] 4.1 Add `@abapify/adt-lint` dependency to `packages/adt-cli/package.json`
- [x] 4.2 Create `packages/adt-cli/src/lib/commands/lint.ts` — `adt lint <file>` command; reads file or `--source`; prints diagnostics; exits non-zero on errors
- [x] 4.3 Create `packages/adt-cli/src/lib/commands/context.ts` — `adt context <objectName>` command; delegates to a `ContextService` that mirrors the MCP `get_context` logic
- [x] 4.4 Create `packages/adt-cli/src/lib/commands/diagnose/` subcommand group with `dumps.ts` and `traces.ts` child commands
- [x] 4.5 Extend `packages/adt-cli/src/lib/commands/source.ts` — add `--method <name>` option to `write` subcommand; invokes method surgery path
- [x] 4.6 Add `--lint-before-write` flag to `adt source write`
- [x] 4.7 Register new commands in the CLI root (`packages/adt-cli/src/lib/commands/index.ts` or equivalent)
- [x] 4.8 Write CLI unit tests for `adt lint`, `adt context`, `adt diagnose dumps`, `adt diagnose traces`
- [x] 4.9 Run `bunx nx build adt-cli && bunx nx test adt-cli && bunx nx lint adt-cli`

## 5. Documentation & final validation

- [x] 5.1 Update `packages/adt-mcp/AGENTS.md` with new tool names and descriptions
- [x] 5.2 Update `packages/adt-cli/AGENTS.md` with new commands
- [x] 5.3 Run `bunx nx format:write` across all changed packages
- [x] 5.4 Run `bunx nx affected -t build,test,lint --base=HEAD~1` and confirm all pass
- [x] 5.5 Run `bunx openspec change validate --change arc-1-feature-parity` and confirm no errors
