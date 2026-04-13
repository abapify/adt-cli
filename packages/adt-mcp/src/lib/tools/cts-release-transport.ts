/**
 * Tool: cts_release_transport – release a transport request
 *
 * CLI equivalent: `adt cts tr release <transport>`
 *
 * Note: The underlying ADT client transport service `release()` method is not
 * yet implemented. This tool returns a clear error until it is.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerCtsReleaseTransportTool(
  server: McpServer,
  _ctx: ToolContext,
): void {
  server.tool(
    'cts_release_transport',
    'Release a transport request',
    {
      ...connectionShape,
      transport: z
        .string()
        .describe('Transport number to release (e.g. S0DK900001)'),
    },
    async (_args) => {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: 'Transport release is not supported: the ADT client transports.release() method is not yet implemented.',
          },
        ],
      };
    },
  );
}
