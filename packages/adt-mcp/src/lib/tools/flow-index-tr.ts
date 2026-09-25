import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AdtFlowError } from '@abapify/adt-flow';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import { resolveFlowWorkspaceRoot } from '../flow-workspace';
import {
  DEFAULT_FLOW_MCP_DEPENDENCIES,
  type FlowMcpDependencies,
} from './flow-checkout-tr';

/**
 * Persist a transport's inventory and unresolved-boundary descriptors without
 * materializing any source files into the workspace.
 */
export function registerFlowIndexTrTool(
  server: McpServer,
  ctx: ToolContext,
  overrides: Partial<FlowMcpDependencies> = {},
): void {
  const dependencies = { ...DEFAULT_FLOW_MCP_DEPENDENCIES, ...overrides };
  server.tool(
    'flow_index_tr',
    'Persist a confined workspace transport inventory without materializing source files.',
    {
      ...sessionOrConnectionShape,
      transports: z.array(z.string().trim().min(1)).min(1),
      workspaceRoot: z
        .string()
        .min(1)
        .describe('Absolute target directory within a server-owned root'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async (args, extra) => {
      try {
        const root = await resolveFlowWorkspaceRoot(
          args.workspaceRoot,
          ctx.workspaceRoots,
        );
        const config = await dependencies.loadFlowConfig(root, ctx);
        const format = dependencies.getFormat(config.format.id);
        if (!format) {
          throw new AdtFlowError(
            'format_unsupported',
            'Configured format is not registered.',
          );
        }
        const revalidatedRoot = await resolveFlowWorkspaceRoot(
          args.workspaceRoot,
          ctx.workspaceRoots,
        );
        if (revalidatedRoot !== root) {
          throw new AdtFlowError(
            'workspace_root_changed',
            'Workspace root changed between configuration load and indexing.',
          );
        }
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const result = await dependencies.createService(client, format).index({
          root,
          transports: args.transports,
          config,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (error) {
        const isFlowError = error instanceof AdtFlowError;
        const code = isFlowError ? error.code : 'FLOW_INDEX_FAILED';
        const message = isFlowError
          ? error.message
          : 'Could not index the requested transport inventory.';
        const cause = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: {
                  code,
                  message,
                  details: isFlowError
                    ? (error.details ?? { cause })
                    : { cause },
                },
              }),
            },
          ],
        };
      }
    },
  );
}
