/**
 * @abapify/adt-pilot – abapify Pilot
 *
 * Mastra AI agent for ABAP code review via ADT MCP.
 *
 * @example
 * ```typescript
 * import { createAbapifyPilot, createCodeReviewWorkflow, connectMcpClient } from '@abapify/adt-pilot';
 * import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
 * import { createMcpServer } from '@abapify/adt-mcp';
 *
 * // Set up MCP server + client
 * const server = createMcpServer();
 * const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
 * await server.connect(serverTransport);
 * const { callTool } = await connectMcpClient(clientTransport);
 *
 * // Create and run the workflow
 * const workflow = createCodeReviewWorkflow(callTool);
 * const run = workflow.createRun();
 * const result = await run.start({
 *   inputData: {
 *     mode: 'package',
 *     packageName: 'ZPACKAGE',
 *     baseUrl: 'http://sap:8000',
 *     username: 'DEVELOPER',
 *     password: 'secret',
 *   },
 * });
 * console.log(result.result); // CodeReviewReport
 * ```
 */

// Types
export type {
  ConnectionParams,
  AtcFinding,
  CodeReviewReport,
  McpToolCaller,
} from './types.js';

// Workflow
export {
  createCodeReviewWorkflow,
  codeReviewInputSchema,
  codeReviewOutputSchema,
} from './workflow.js';
export type { CodeReviewInput, CodeReviewWorkflowHandle } from './workflow.js';

// MCP client factory
export { createMcpToolCaller, connectMcpClient } from './mcp-client.js';

// Agent
export { createReviewAgent } from './agent.js';
export type { ReviewAgentConfig } from './agent.js';

// Harness
export { createAbapifyPilot } from './harness.js';
export type { AbapifyPilotConfig } from './harness.js';
