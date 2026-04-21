/**
 * MCP tool: `delete_cert` – remove a certificate from a STRUST PSE.
 *
 * Corresponds to CLI `adt strust delete <context> <applic> <cert-id>`.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerDeleteCertTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'delete_cert',
    'Delete a certificate from a STRUST PSE.',
    {
      ...sessionOrConnectionShape,
      context: z.string().describe('PSE context (e.g. SSLC, SSLS)'),
      applic: z.string().describe('PSE application (e.g. DFAULT, ANONYM)'),
      certId: z
        .string()
        .describe(
          'Certificate id (from list_certs, typically a 1-based index)',
        ),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        await client.adt.system.security.pses.deleteCertificate(
          args.context,
          args.applic,
          args.certId,
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  ok: true,
                  context: args.context,
                  applic: args.applic,
                  certId: args.certId,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `delete_cert failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
