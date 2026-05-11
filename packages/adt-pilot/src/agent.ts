/**
 * abapify Pilot – Mastra Agent
 *
 * Creates the `review` Mastra Agent that powers the Code Review mode in
 * the Harness. The agent is wired with MCP tools loaded from
 * `@abapify/adt-mcp`, so an LLM can call any ADT operation directly.
 *
 * The agent is _optional_ for code review use cases: the deterministic
 * {@link createCodeReviewWorkflow} performs the same task without an LLM.
 * Use the agent when you want natural-language interaction or planning
 * on top of the review workflow.
 */

import { Agent } from '@mastra/core/agent';
import type { ToolsInput } from '@mastra/core/agent';

/** Configuration for the review agent. */
export interface ReviewAgentConfig {
  /**
   * Model identifier (e.g. `"openai/gpt-4o"`,
   * `"anthropic/claude-3-5-sonnet"`).
   *
   * Required by Mastra `Agent`. The model is _not_ exercised by the
   * deterministic Code Review workflow — it is only invoked when the
   * agent is driven directly via the Harness or Mastra runtime.
   */
  model: string;

  /**
   * MCP tools made available to the agent. Typically loaded via
   * `@mastra/mcp`'s `MCPClient.listTools()` (one entry per `adt-mcp`
   * tool such as `list_package_objects`, `atc_run`, `cts_get_transport`).
   *
   * Pass `undefined` to keep the agent text-only.
   */
  tools?: ToolsInput;

  /**
   * Optional override for the agent's system instructions. Defaults to
   * the abapify Pilot system prompt focused on ATC code review.
   */
  instructions?: string;
}

/** Default system instructions for the review agent. */
export const REVIEW_AGENT_INSTRUCTIONS = `
You are abapify Pilot, an expert ABAP code review assistant powered by SAP ADT.

Your task is to analyse ABAP code quality using the ATC (ABAP Test Cockpit) framework.
You have access to ADT MCP tools that let you:
- List objects in a package (list_package_objects)
- Get details of a transport request (cts_get_transport)
- Run ATC checks on objects or transports (atc_run)

When asked to review a package, use list_package_objects to enumerate the objects
and atc_run to run quality checks. For transports, use cts_get_transport first,
then atc_run on the transport URI.

Always present findings grouped by severity and provide clear remediation guidance.
`.trim();

/**
 * Create the Mastra `Agent` for the abapify Pilot review mode.
 *
 * @param config Agent configuration — model, optional pre-loaded tools,
 *               and optional custom instructions.
 */
export function createReviewAgent(config: ReviewAgentConfig): Agent<string> {
  return new Agent({
    id: 'review',
    name: 'abapify Pilot – Review',
    instructions: config.instructions ?? REVIEW_AGENT_INSTRUCTIONS,
    model: config.model,
    ...(config.tools ? { tools: config.tools } : {}),
  });
}
