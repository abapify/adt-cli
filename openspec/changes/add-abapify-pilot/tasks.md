## 1. Scaffold `packages/adt-pilot`

- [ ] 1.1 Create `packages/adt-pilot/` directory with `package.json` (`@abapify/adt-pilot`, version `0.3.6`, ESM, `exports: { ".": "./dist/index.mjs" }`)
- [ ] 1.2 Add `tsconfig.json` and `tsdown.config.ts` mirroring `packages/adt-mcp`
- [ ] 1.3 Add `project.json` for Nx with `build`, `test`, `lint`, `typecheck` targets
- [ ] 1.4 Add `vitest.config.ts` using the workspace preset
- [ ] 1.5 Create `src/index.ts` (empty barrel — fills in later tasks)

## 2. Add dependencies

- [ ] 2.1 Add `@mastra/core`, `@mastra/mcp` as runtime dependencies in `packages/adt-pilot/package.json`
- [ ] 2.2 Add `@abapify/adt-mcp` as a runtime dependency
- [ ] 2.3 Add `zod` as a runtime dependency
- [ ] 2.4 Add `@abapify/adt-fixtures` as a dev dependency
- [ ] 2.5 Run `bun install` to update the lockfile

## 3. Implement types (`src/types.ts`)

- [ ] 3.1 Define `ConnectionParams` (`baseUrl`, `username`, `password`, `client?`)
- [ ] 3.2 Define `AtcFinding` (`objectUri`, `priority`, `description`, `category?`, `checkName?`, `location?`)
- [ ] 3.3 Define `CodeReviewReport` (`mode`, `target`, `objects`, `findings`, `summary`)
- [ ] 3.4 Export all types from `src/index.ts`

## 4. Implement `codeReviewWorkflow` (`src/workflow.ts`)

- [ ] 4.1 Create `resolveObjects` step: accepts `{ mode, packageName?, transportNumber?, ...conn }`, calls `list_package_objects` or `cts_get_transport` via MCP client, returns `{ objects: string[] }`
- [ ] 4.2 Create `runAtcChecks` step: accepts `{ objects, ...conn }`, calls `atc_run` per object, returns `{ rawResults: AtcRunResult[] }`
- [ ] 4.3 Create `buildReport` step: accepts `{ mode, target, objects, rawResults }`, maps to `CodeReviewReport`
- [ ] 4.4 Wire steps with `createWorkflow(...).then(resolveObjects).then(runAtcChecks).then(buildReport).commit()`
- [ ] 4.5 Export `codeReviewWorkflow` from `src/index.ts`
- [ ] 4.6 Define and export Zod schemas for input and output

## 5. Implement MCP client factory (`src/mcp-client.ts`)

- [ ] 5.1 Create `createMcpToolSet(serverParams)` function using `@mastra/mcp`'s `MCPClient` that returns the tool set from the `@abapify/adt-mcp` server
- [ ] 5.2 Export `createMcpToolSet` from `src/index.ts`

## 6. Implement Harness agent (`src/agent.ts` + `src/harness.ts`)

- [ ] 6.1 Create `reviewAgent`: Mastra `Agent` with `id: 'review'`, instructions describing code review purpose, and MCP tools
- [ ] 6.2 Create `createAbapifyPilot(config)` factory returning a `Harness` with mode `{ id: 'review', default: true, agent: reviewAgent }`
- [ ] 6.3 Export `createAbapifyPilot` from `src/index.ts`

## 7. Write tests (`tests/`)

- [ ] 7.1 Create `tests/workflow.test.ts`: package mode happy path using `@abapify/adt-fixtures` mock server
- [ ] 7.2 Create `tests/workflow.test.ts` (continued): transport mode happy path
- [ ] 7.3 Create `tests/workflow.test.ts` (continued): empty package → empty report
- [ ] 7.4 Create `tests/workflow.test.ts` (continued): partial ATC failure → report with error finding
- [ ] 7.5 Create `tests/types.test.ts`: Zod schema validation for `CodeReviewReport`
- [ ] 7.6 Create `tests/mcp-client.test.ts`: mock MCPClient connect/disconnect lifecycle

## 8. Verify & finalize

- [ ] 8.1 Run `bunx nx build adt-pilot` — confirm build succeeds
- [ ] 8.2 Run `bunx nx test adt-pilot` — confirm all tests pass
- [ ] 8.3 Run `bunx nx lint adt-pilot` — confirm no lint errors
- [ ] 8.4 Run `bunx nx typecheck adt-pilot` — confirm no type errors
- [ ] 8.5 Run `bunx nx format:write` — format all changed files
