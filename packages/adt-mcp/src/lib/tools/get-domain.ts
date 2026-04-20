/**
 * Tool: get_domain – fetch DDIC domain metadata
 *
 * Corresponds to CLI `adt get domain <name>`.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerGetDomainTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_domain',
    'Fetch DDIC domain metadata (type information, fixed values, output info).',
    {
      ...sessionOrConnectionShape,
      domainName: z.string().describe('Domain name (e.g. ZDOM_SAMPLE)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const result = await client.adt.ddic.domains.get(
          args.domainName.toLowerCase(),
        );
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Get domain failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
