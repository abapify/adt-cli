/**
 * abapify Pilot — Mastra entry-point
 *
 * This file is the entry-point for `mastra dev`. It:
 *  1. Connects to the adt-mcp HTTP server (MCP_SERVER_URL).
 *  2. Loads all ADT tools via MCPClient.
 *  3. Creates the review Agent backed by a LiteLLM-compatible model.
 *  4. Exports a Mastra instance — picked up by `mastra dev` automatically.
 *
 * Required environment variables:
 *   MCP_SERVER_URL      URL of the adt-mcp HTTP server  (default: http://127.0.0.1:3001/mcp)
 *   LITELLM_BASE_URL    LiteLLM proxy base URL           (default: http://127.0.0.1:4000)
 *   LITELLM_API_KEY     API key for LiteLLM proxy        (required)
 *   MODEL               Model name recognised by LiteLLM (default: openai/gpt-4o)
 *
 * Start both servers with:
 *   bun run dev:pilot      (from monorepo root)
 *
 * Then open:
 *   http://localhost:4112  — Mastra Playground / Studio
 *
 * If you need to set MCP CORS for local development, use:
 *   MCP_CORS_ORIGIN=http://localhost:4112
 */

import { Mastra } from '@mastra/core/mastra';
import { Agent } from '@mastra/core/agent';
import { MCPClient } from '@mastra/mcp';
import { createOpenAI } from '@ai-sdk/openai';

const reviewAgentInstructions = `You are an expert ABAP code reviewer using SAP ADT (ABAP Development Tools) and ATC (ABAP Test Cockpit).

Your task is to review ABAP code by:
1. Listing all objects in the specified package or transport
2. Running ATC checks on those objects
3. Providing a structured report with findings and recommendations

Available tools:
- list_package_objects: List objects in a package
- atc_run: Run ATC checks on objects
- sap_connect: Authenticate to SAP system

Always authenticate first using sap_connect before calling other tools.
Provide clear, actionable feedback on code quality, security, and performance issues.`;

const mcpServerUrl = process.env.MCP_SERVER_URL ?? 'http://127.0.0.1:3001/mcp';
const litellmBaseUrl = process.env.LITELLM_BASE_URL ?? 'http://127.0.0.1:4000';
const litellmApiKey = process.env.LITELLM_API_KEY;
if (!litellmApiKey) {
  throw new Error('LITELLM_API_KEY environment variable is required');
}
const modelName = process.env.MODEL ?? 'openai/gpt-4o';

const litellm = createOpenAI({
  baseURL: litellmBaseUrl,
  apiKey: litellmApiKey,
  compatibility: 'compatible',
});

const mcp = new MCPClient({
  servers: {
    'adt-mcp': {
      url: new URL(mcpServerUrl),
    },
  },
});

const tools = await mcp.getTools();

const reviewAgent = new Agent({
  id: 'review',
  name: 'abapify Pilot – Review',
  instructions: reviewAgentInstructions,
  model: litellm(modelName),
  tools,
});

export const mastra = new Mastra({
  agents: { reviewAgent },
});
