/**
 * Tool: cts_reassign_transport – change owner of a transport request
 *
 * CLI equivalent: `adt cts tr reassign <TR> <new-owner> [--recursive]`
 *
 * POSTs a changeowner user-action body to
 *   /sap/bc/adt/cts/transportrequests/{trkorr}
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

function escapeXmlAttr(value: string): string {
  return value
    .replaceAll(/&/g, '&amp;')
    .replaceAll(/</g, '&lt;')
    .replaceAll(/>/g, '&gt;')
    .replaceAll(/"/g, '&quot;');
}

export function registerCtsReassignTransportTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'cts_reassign_transport',
    'Change the owner of a transport request (optionally cascading to modifiable tasks).',
    {
      ...sessionOrConnectionShape,
      transportNumber: z
        .string()
        .describe('Transport number (e.g. S0DK900123)'),
      targetUser: z.string().describe('SAP username of the new owner'),
      recursive: z
        .boolean()
        .optional()
        .describe('Also reassign all modifiable tasks (default: false)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});

        const body =
          '<?xml version="1.0" encoding="UTF-8"?>' +
          '<tm:root xmlns:tm="http://www.sap.com/cts/adt/tm" ' +
          'tm:useraction="changeowner" ' +
          `tm:targetuser="${escapeXmlAttr(args.targetUser)}"/>`;

        const query = args.recursive ? '?recursive=true' : '';

        await client.fetch(
          `/sap/bc/adt/cts/transportrequests/${args.transportNumber}${query}`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/vnd.sap.adt.transportorganizer.v1+xml',
              Accept: 'application/vnd.sap.adt.transportorganizer.v1+xml',
            },
            body,
          },
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'reassigned',
                  transport: args.transportNumber,
                  newOwner: args.targetUser,
                  recursive: args.recursive ?? false,
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
              text: `Reassign transport failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
