/**
 * Tool: cts_create_transport – create a new transport request
 *
 * CLI equivalent: `adt cts tr create`
 *
 * Note: The underlying ADT client transport service `create()` method is not
 * yet implemented. This tool returns a clear error until it is.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerCtsCreateTransportTool(
  server: McpServer,
  _ctx: ToolContext,
): void {
  server.tool(
    'cts_create_transport',
    'Create a new transport request',
    {
      ...connectionShape,
      description: z.string().describe('Transport description'),
      type: z
        .enum(['K', 'W'])
        .optional()
        .describe(
          'Transport type: K (Workbench) or W (Customizing). Default: K',
        ),
      target: z.string().optional().describe('Target system (default: LOCAL)'),
      project: z.string().optional().describe('CTS project name'),
    },
    async (_args) => {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: 'Create transport is not supported: the underlying ADT client transport service "create" method is not yet implemented.',
          },
        ],
      };
    },
  );
}
