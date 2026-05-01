/**
 * abapify Pilot – Harness factory
 *
 * Creates a Mastra `Harness` with the review agent mode.
 * The Harness is the top-level orchestrator that a UI (TUI, web) can drive.
 *
 * @example
 * ```typescript
 * const pilot = createAbapifyPilot({
 *   model: 'openai/gpt-4o',
 *   mcpTools: await mcpClient.listTools(),
 * });
 * await pilot.init();
 * await pilot.selectOrCreateThread();
 * await pilot.sendMessage({ content: 'Review package ZPACKAGE on https://my-sap.example.com' });
 * ```
 */

import { Harness } from '@mastra/core/harness';
import type { ToolsInput } from '@mastra/core/agent';
import { createReviewAgent } from './agent';

/** Configuration for the abapify Pilot Harness */
export interface AbapifyPilotConfig {
  /**
   * Model identifier forwarded to the review agent.
   * (e.g. "openai/gpt-4o", "anthropic/claude-3-5-sonnet")
   */
  model: string;
  /**
   * MCP tools to inject into the agent.
   * Load them from `@mastra/mcp`'s `MCPClient.listTools()` or pass an
   * in-process tool set for testing.
   */
  mcpTools?: ToolsInput;
}

/**
 * Create the abapify Pilot `Harness`.
 *
 * The Harness ships with a single **review** mode wired to the review agent.
 * Additional modes (plan, fix, …) can be added here in future iterations.
 *
 * @param config - Harness configuration
 */
export function createAbapifyPilot(config: AbapifyPilotConfig): Harness {
  const reviewAgent = createReviewAgent({
    model: config.model,
    tools: config.mcpTools,
  });

  return new Harness({
    id: 'abapify-pilot',
    modes: [
      {
        id: 'review',
        name: 'Code Review',
        default: true,
        agent: reviewAgent,
      },
    ],
  });
}
