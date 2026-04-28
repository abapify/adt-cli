/**
 * abapify Pilot – Mastra Agent
 *
 * Creates the `review` agent that powers the Code Review mode in the Harness.
 * The agent is wired with MCP tools from `@abapify/adt-mcp` so it can
 * directly call any ADT operation.
 */

import { Agent } from '@mastra/core/agent';
import type { ToolsInput } from '@mastra/core/agent';

/** Configuration for the review agent */
export interface ReviewAgentConfig {
  /**
   * Model identifier (e.g. "openai/gpt-4o", "anthropic/claude-3-5-sonnet").
   * Required by Mastra Agent but not exercised in the Code Review workflow
   * (the workflow is deterministic and does not call the LLM).
   */
  model: string;
  /** MCP tools loaded from `@abapify/adt-mcp` */
  tools?: ToolsInput;
}

/** System instructions for the review agent */
const REVIEW_INSTRUCTIONS = `
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
 * @param config - Agent configuration (model + optional pre-loaded tools)
 */
export function createReviewAgent(config: ReviewAgentConfig): Agent<string> {
  return new Agent({
    id: 'review',
    name: 'abapify Pilot – Review',
    instructions: REVIEW_INSTRUCTIONS,
    model: config.model,
    ...(config.tools ? { tools: config.tools } : {}),
  });
}
