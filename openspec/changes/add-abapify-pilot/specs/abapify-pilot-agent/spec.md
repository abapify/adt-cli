## ADDED Requirements

### Requirement: Package exports Harness and agent

The `@abapify/adt-pilot` package SHALL export a `createAbapifyPilot(config)` factory that returns a configured Mastra `Harness` instance with the **review** mode wired to the `codeReviewWorkflow`.

#### Scenario: Factory returns Harness

- **WHEN** `createAbapifyPilot({ mcpServerParams, model })` is called
- **THEN** it returns a `Harness` instance with at least one mode whose `id` is `"review"`

#### Scenario: Harness mode agent is configured

- **WHEN** the returned Harness is initialised
- **THEN** the `review` mode agent has the MCP tools from `@abapify/adt-mcp` available

### Requirement: Package exports workflow

The `@abapify/adt-pilot` package SHALL export `codeReviewWorkflow` so it can be used outside the Harness context.

#### Scenario: Direct workflow import

- **WHEN** `import { codeReviewWorkflow } from '@abapify/adt-pilot'` is used
- **THEN** `codeReviewWorkflow` is a Mastra `Workflow` instance with `inputSchema` and `outputSchema`

### Requirement: Connection config passed as workflow input

The workflow and agent SHALL NOT store SAP connection credentials in package-level state. Credentials (`baseUrl`, `username`, `password`, `client?`) SHALL be passed as part of every workflow run's input.

#### Scenario: Credentials forwarded to MCP tools

- **WHEN** the workflow is executed with `{ baseUrl, username, password, mode, ... }`
- **THEN** all MCP tool calls include those credentials as arguments

### Requirement: Package is a publishable Nx library

The package SHALL be located at `packages/adt-pilot`, use the name `@abapify/adt-pilot`, and follow the same tsdown build + Vitest test setup used by other packages in the monorepo.

#### Scenario: Build succeeds

- **WHEN** `bunx nx build adt-pilot` is run
- **THEN** the build exits 0 and `packages/adt-pilot/dist/` is populated with `.mjs` and `.d.mts` files

#### Scenario: Tests pass

- **WHEN** `bunx nx test adt-pilot` is run
- **THEN** all tests pass and coverage reaches 100% of statements/branches
