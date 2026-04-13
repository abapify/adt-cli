/**
 * Tool: lock_object – acquire an ADT edit lock on an ABAP object
 *
 * Returns the lock handle that must be passed to unlock_object and to
 * update_source / other write operations that require a prior lock.
 *
 * Uses the LockService from @abapify/adt-locks for the full SAP security
 * session / CSRF handshake required for stateful lock operations.
 *
 * ADT endpoint: POST {objectUri}?_action=LOCK
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createLockService } from '@abapify/adt-locks';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';
import { resolveObjectUri } from './utils';

export function registerLockObjectTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'lock_object',
    'Acquire an ADT edit lock on an ABAP object and return the lock handle needed for subsequent write operations.',
    {
      ...connectionShape,
      objectName: z.string().describe('ABAP object name'),
      objectType: z
        .string()
        .optional()
        .describe('Object type (e.g. CLAS, PROG, INTF, FUGR)'),
      transport: z.string().optional().describe('Transport request number'),
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
        const lockHandle = await lockService.lock(objectUri, {
          transport: args.transport,
          objectName: args.objectName,
          objectType: args.objectType,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'locked',
                  objectName: args.objectName.toUpperCase(),
                  objectUri,
                  lockHandle: lockHandle.handle,
                  correlationNumber: lockHandle.correlationNumber,
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
              text: `Lock object failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
