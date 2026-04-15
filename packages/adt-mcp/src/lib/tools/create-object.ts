/**
 * Tool: create_object – create a new ABAP object
 *
 * Supports creating the most common ABAP object types using the typed ADT contracts:
 * PROG (program), CLAS (class), INTF (interface), FUGR (function group), DEVC (package)
 *
 * Uses the respective typed CRUD contract for each object type so that all
 * XML serialisation goes through the schema pipeline (no manual XML building).
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import {
  createAdtObject,
  CREATE_OBJECT_TYPES,
  isCreateObjectType,
} from './object-creation';
import { connectionShape } from './shared-schemas';

export function registerCreateObjectTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'create_object',
    'Create a new ABAP object. Supported types: PROG (program), CLAS (class), INTF (interface), FUGR (function group), and DEVC (package).',
    {
      ...connectionShape,
      objectName: z
        .string()
        .describe(
          'Name of the new object (uppercase, e.g. ZCL_MY_CLASS, ZPACKAGE)',
        ),
      objectType: z
        .string()
        .describe('Object type: PROG, CLAS, INTF, FUGR, or DEVC'),
      description: z.string().describe('Short description of the object'),
      packageName: z
        .string()
        .optional()
        .describe(
          'Package to assign the object to (required for non-local objects)',
        ),
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
        const objectType = args.objectType.toUpperCase();
        const objectName = args.objectName.toUpperCase();

        if (!isCreateObjectType(objectType)) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Object type '${objectType}' is not supported. Supported types: ${CREATE_OBJECT_TYPES.join(', ')}`,
              },
            ],
          };
        }

        await createAdtObject(client, {
          objectType,
          objectName,
          description: args.description,
          packageName: args.packageName,
          transport: args.transport,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'created',
                  objectName,
                  objectType,
                  description: args.description,
                  packageName: args.packageName?.toUpperCase(),
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
              text: `Create object failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
