/**
 * Tool: unlock_object – release an ADT edit lock on an ABAP object
 *
 * Requires the lock handle returned by lock_object (or update_source).
 *
 * ADT endpoint: POST {objectUri}?_action=UNLOCK&lockHandle={handle}
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createLockService } from '@abapify/adt-locks';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';
import { resolveObjectUri } from './utils';

export function registerUnlockObjectTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'unlock_object',
    'Release an ADT edit lock acquired with lock_object. Requires the lockHandle returned by lock_object.',
    {
      ...connectionShape,
      objectName: z.string().describe('ABAP object name'),
      objectType: z
        .string()
        .optional()
        .describe('Object type (e.g. CLAS, PROG, INTF, FUGR)'),
      lockHandle: z.string().describe('Lock handle returned by lock_object'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);

        const objectUri = await resolveObjectUri(
          client,
          args.objectName,
          args.objectType,
        );

        if (!objectUri) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Object '${args.objectName}' not found`,
              },
            ],
          };
        }

        const lockService = createLockService(client);
        await lockService.unlock(objectUri, { lockHandle: args.lockHandle });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'unlocked',
                  objectName: args.objectName.toUpperCase(),
                  objectUri,
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
              text: `Unlock object failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
