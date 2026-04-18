/**
 * Tool: cts_update_transport – update a transport request (non-interactive)
 *
 * CLI equivalent: `adt cts tr set <TR> --description ... --target ...`
 *
 * Acquires a lock on the transport via adt-locks, PUTs the updated metadata,
 * then releases the lock.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createLockService } from '@abapify/adt-locks';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function registerCtsUpdateTransportTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'cts_update_transport',
    'Update a transport request (description, target, project). Uses ADT lock/unlock protocol.',
    {
      ...connectionShape,
      transportNumber: z
        .string()
        .describe('Transport number (e.g. S0DK900123)'),
      description: z.string().optional().describe('New transport description'),
      target: z.string().optional().describe('New target system'),
      project: z.string().optional().describe('CTS project name'),
    },
    async (args) => {
      try {
        if (!args.description && !args.target && !args.project) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: 'At least one of description, target, or project must be provided.',
              },
            ],
          };
        }

        const client = ctx.getClient(args);
        const objectUri = `/sap/bc/adt/cts/transportrequests/${args.transportNumber}`;
        const lockService = createLockService(client);
        const lockHandle = await lockService.lock(objectUri, {
          objectName: args.transportNumber,
          objectType: 'TRAN',
        });

        try {
          const attrs: string[] = [];
          if (args.description)
            attrs.push(`tm:desc="${escapeXmlAttr(args.description)}"`);
          if (args.target)
            attrs.push(`tm:target="${escapeXmlAttr(args.target)}"`);
          if (args.project)
            attrs.push(`tm:cts_project="${escapeXmlAttr(args.project)}"`);

          const body =
            '<?xml version="1.0" encoding="UTF-8"?>' +
            '<tm:root xmlns:tm="http://www.sap.com/cts/adt/tm">' +
            `<tm:request ${attrs.join(' ')}/>` +
            '</tm:root>';

          const query = `?lockHandle=${encodeURIComponent(lockHandle.handle)}`;

          await client.fetch(`${objectUri}${query}`, {
            method: 'PUT',
            headers: {
              'Content-Type':
                'application/vnd.sap.adt.transportorganizer.v1+xml',
              Accept: 'application/vnd.sap.adt.transportorganizer.v1+xml',
            },
            body,
          });

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    status: 'updated',
                    transport: args.transportNumber,
                    description: args.description,
                    target: args.target,
                    project: args.project,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } finally {
          try {
            await lockService.unlock(objectUri, {
              lockHandle: lockHandle.handle,
            });
          } catch {
            // ignore unlock failures – surface original error if any
          }
        }
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Update transport failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
