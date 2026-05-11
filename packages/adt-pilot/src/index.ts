/**
 * @abapify/adt-pilot – abapify Pilot
 *
 * Mastra-powered ABAP code review tooling. The package exposes two
 * complementary modes that share the same MCP-backed implementation:
 *
 * 1. **Workflow mode** — a deterministic Mastra `Workflow`
 *    ({@link createCodeReviewWorkflow}) that runs ATC checks on a package
 *    or a transport request and returns a structured
 *    {@link CodeReviewReport}. No LLM is required.
 * 2. **Harness mode** — a Mastra `Harness` ({@link createAbapifyPilot}) that
 *    wraps a `review` Agent so a user can drive code review interactively
 *    via natural language. The Agent is wired with the same MCP tools
 *    used by the workflow.
 *
 * Both modes accept either a package or a transport as the review target.
 *
 * @example Workflow mode
 * ```typescript
 * import {
 *   createCodeReviewWorkflow,
 *   connectMcpClient,
 * } from '@abapify/adt-pilot';
 * import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
 * import { createMcpServer } from '@abapify/adt-mcp';
 *
 * const server = createMcpServer();
 * const [clientTransport, serverTransport] =
 *   InMemoryTransport.createLinkedPair();
 * await server.connect(serverTransport);
 * const { callTool } = await connectMcpClient(clientTransport);
 *
 * const workflow = createCodeReviewWorkflow(callTool);
 * const run = await workflow.createRun();
 * const result = await run.start({
 *   inputData: {
 *     mode: 'package',
 *     packageName: 'ZPACKAGE',
 *     baseUrl: 'https://sap.example.com',
 *     username: 'DEVELOPER',
 *     password: 'secret',
 *   },
 * });
 * if (result.status === 'success') {
 *   console.log(result.result); // CodeReviewReport
 * }
 * ```
 *
 * @example Harness mode
 * ```typescript
 * import { createAbapifyPilot } from '@abapify/adt-pilot';
 *
 * const pilot = createAbapifyPilot({
 *   model: 'openai/gpt-4o',
 *   mcpTools: await mcpClient.listTools(),
 * });
 * await pilot.init();
 * await pilot.selectOrCreateThread();
 * await pilot.sendMessage({ content: 'Review package ZPACKAGE on https://sap.example.com' });
 * ```
 */

// Types
export type {
  ConnectionParams,
  AtcFinding,
  AtcStepResult,
  CodeReviewMode,
  CodeReviewReport,
  McpToolCaller,
} from './types';

// Workflow
export {
  createCodeReviewWorkflow,
  codeReviewInputSchema,
  codeReviewOutputSchema,
} from './workflow';
export type {
  CodeReviewInput,
  CodeReviewWorkflow,
  CodeReviewRun,
  CodeReviewRunResult,
} from './workflow';

// MCP client factory
export { createMcpToolCaller, connectMcpClient } from './mcp-client';

// Agent
export { createReviewAgent, REVIEW_AGENT_INSTRUCTIONS } from './agent';
export type { ReviewAgentConfig } from './agent';

// Harness
export { createAbapifyPilot } from './harness';
export type { AbapifyPilotConfig } from './harness';
