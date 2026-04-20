/**
 * MCP tool: `upload_cert` – upload a PEM certificate into a STRUST PSE.
 *
 * Corresponds to CLI `adt strust put <context> <applic> <pem-file>`.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerUploadCertTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'upload_cert',
    'Upload a PEM-encoded X.509 certificate into a STRUST PSE.',
    {
      ...sessionOrConnectionShape,
      context: z.string().describe('PSE context (e.g. SSLC, SSLS)'),
      applic: z.string().describe('PSE application (e.g. DFAULT, ANONYM)'),
      pem: z
        .string()
        .describe(
          'PEM-encoded certificate text (BEGIN/END CERTIFICATE blocks)',
        ),
    },
    async (args, extra) => {
      try {
        if (!args.pem.includes('BEGIN CERTIFICATE')) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: 'upload_cert failed: pem argument is not a PEM-encoded certificate',
              },
            ],
          };
        }
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const result = await client.adt.system.security.pses.uploadCertificate(
          args.context,
          args.applic,
          args.pem,
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
              text: `upload_cert failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
