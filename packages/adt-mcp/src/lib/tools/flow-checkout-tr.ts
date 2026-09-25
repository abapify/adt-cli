import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import {
  DEFAULT_FLOW_MCP_DEPENDENCIES,
  runFlowTransportTool,
  type FlowMcpDependencies,
} from './flow-transport-common';

export { type FlowMcpDependencies } from './flow-transport-common';

export function registerFlowCheckoutTrTool(
  server: McpServer,
  ctx: ToolContext,
  overrides: Partial<FlowMcpDependencies> = {},
): void {
  const dependencies = { ...DEFAULT_FLOW_MCP_DEPENDENCIES, ...overrides };
  server.tool(
    'flow_checkout_tr',
    'Reconcile a confined workspace to the exact base or head source boundary of one or more transports.',
    {
      ...sessionOrConnectionShape,
      transports: z.array(z.string().trim().min(1)).min(1),
      base: z.boolean().optional(),
      workspaceRoot: z
        .string()
        .min(1)
        .describe('Absolute target directory within a server-owned root'),
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    (args, extra) =>
      runFlowTransportTool({
        ctx,
        dependencies,
        args,
        extra: extra ?? {},
        options: {
          rootChangedMessage:
            'Workspace root changed between configuration load and checkout.',
          failureCode: 'FLOW_CHECKOUT_FAILED',
          failureMessage:
            'Could not materialize the requested transport boundary.',
          run: (service, input) =>
            service.checkout({
              ...input,
              mode: args.base ? 'base' : 'head',
            }),
        },
      }),
  );
}
