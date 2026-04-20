/**
 * Tool: system_info – get SAP system and session information
 *
 * CLI equivalent: `adt info`
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerSystemInfoTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'system_info',
    'Get SAP system and/or session information',
    {
      ...sessionOrConnectionShape,
      scope: z
        .enum(['session', 'system', 'both'])
        .optional()
        .describe('What to retrieve (default: both)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const scope = args.scope ?? 'both';
        const result: Record<string, unknown> = {};

        if (scope === 'session' || scope === 'both') {
          result.session = await client.adt.core.http.sessions.getSession();
        }

        if (scope === 'system' || scope === 'both') {
          result.system =
            await client.adt.core.http.systeminformation.getSystemInfo();
        }

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
              text: `System info failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
