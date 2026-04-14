/**
 * Tool: delete_object – delete an ABAP object
 *
 * Deletes an ABAP object using the appropriate typed CRUD contract.
 * Supports the same types as create_object: PROG, CLAS, INTF, FUGR, DEVC.
 *
 * For other object types, falls back to resolving the URI and using
 * a direct DELETE request.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';
import { resolveObjectUri } from './utils';

export function registerDeleteObjectTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'delete_object',
    'Delete an ABAP object. Supports PROG, CLAS, INTF, FUGR, DEVC and falls back to direct URI deletion for other types.',
    {
      ...connectionShape,
      objectName: z.string().describe('Name of the ABAP object to delete'),
      objectType: z
        .string()
        .optional()
        .describe('Object type (e.g. CLAS, PROG, INTF, FUGR, DEVC)'),
      transport: z
        .string()
        .optional()
        .describe(
          'Transport request number (required for transportable objects)',
        ),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const objectName = args.objectName.toUpperCase();
        const objectType = args.objectType?.toUpperCase();
        const queryOptions = args.transport ? { corrNr: args.transport } : {};
        const nameLower = objectName.toLowerCase();

        // Use typed CRUD contracts for known types
        if (objectType === 'PROG') {
          await client.adt.programs.programs.delete(nameLower, queryOptions);
        } else if (objectType === 'CLAS') {
          await client.adt.oo.classes.delete(nameLower, queryOptions);
        } else if (objectType === 'INTF') {
          await client.adt.oo.interfaces.delete(nameLower, queryOptions);
        } else if (objectType === 'FUGR') {
          await client.adt.functions.groups.delete(nameLower, queryOptions);
        } else if (objectType === 'DEVC') {
          // Packages contract uses case-sensitive names
          await client.adt.packages.delete(objectName, queryOptions);
        } else {
          // Fall back to resolving the URI and issuing a raw DELETE
          const uri = await resolveObjectUri(client, objectName, objectType);
          if (!uri) {
            return {
              isError: true,
              content: [
                {
                  type: 'text' as const,
                  text: `Object '${objectName}' not found`,
                },
              ],
            };
          }

          const params = new URLSearchParams();
          if (args.transport) params.set('corrNr', args.transport);
          const qs = params.toString();
          await client.fetch(`${uri}${qs ? `?${qs}` : ''}`, {
            method: 'DELETE',
          });
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { status: 'deleted', objectName, objectType },
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
              text: `Delete object failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
