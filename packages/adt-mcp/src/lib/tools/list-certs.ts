/**
 * MCP tool: `list_certs` – list certificates inside a STRUST PSE.
 *
 * Corresponds to CLI `adt strust get <context> <applic>`.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerListCertsTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'list_certs',
    'List X.509 certificates installed in a STRUST PSE.',
    {
      ...sessionOrConnectionShape,
      context: z.string().describe('PSE context (e.g. SSLC, SSLS)'),
      applic: z.string().describe('PSE application (e.g. DFAULT, ANONYM)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const result = await client.adt.system.security.pses.listCertificates(
          args.context,
          args.applic,
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
              text: `list_certs failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
