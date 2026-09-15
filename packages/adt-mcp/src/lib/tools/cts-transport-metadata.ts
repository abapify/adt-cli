import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CtsTransportMetadataService } from '@abapify/adt-cli';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

/** Register the typed CTS metadata projection shared with `adt cts tr metadata`. */
export function registerCtsTransportMetadataTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'cts_transport_metadata',
    'Get typed request/task metadata including CTS status, parent, type, and last-change timestamp.',
    {
      ...sessionOrConnectionShape,
      transport: z
        .string()
        .trim()
        .min(1)
        .describe('Transport request or task number'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const metadata = await new CtsTransportMetadataService(client).get(
          args.transport,
        );
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(metadata, null, 2) },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Transport metadata failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
