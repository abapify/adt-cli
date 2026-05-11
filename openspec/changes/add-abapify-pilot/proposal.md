## Why

AI-driven code review is a high-value workflow for SAP ABAP developers. By combining Mastra AI's agent framework with the existing `@abapify/adt-mcp` MCP server, we can ship a first-class agent — **abapify Pilot** — that runs ATC-based code review on an entire package hierarchy or a transport request without requiring any additional ADT integration code.

## What Changes

- New package `packages/adt-pilot` containing a Mastra `Harness`-based agent called **abapify Pilot**.
- The agent supports a **Code Review** workflow with two input modes:
  - **Package mode** — given an ABAP package name, recursively reviews all objects including sub-packages.
  - **Transport mode** — given a transport request number, reviews all objects included in that transport.
- The agent uses `@abapify/adt-mcp` tools (via Mastra `MCPClient`) as its only ADT integration layer.
- Full Vitest test suite with 100% coverage using `@abapify/adt-fixtures` payloads (mock ADT server pattern).

## Capabilities

### New Capabilities

- `abapify-pilot-agent`: Mastra `Harness` + `Agent` setup for abapify Pilot, with connection config and MCP tool wiring.
- `code-review-workflow`: `createWorkflow` that accepts either `{ mode: 'package', packageName }` or `{ mode: 'transport', transportNumber }` as input and produces a structured code review report.

### Modified Capabilities

<!-- none -->

## Impact

- **New package**: `packages/adt-pilot` (publishable, `@abapify/adt-pilot`)
- **Dependencies added**: `@mastra/core` (peer dep on `ai` SDK), `@abapify/adt-mcp`, `zod`
- **Dev dependencies**: `@abapify/adt-fixtures` (test fixtures), `vitest`
- **No breaking changes** to existing packages
- **Nx graph**: `adt-pilot` depends on `adt-mcp` and `adt-fixtures` (test only)
