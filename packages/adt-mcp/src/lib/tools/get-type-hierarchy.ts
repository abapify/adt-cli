/**
 * Tool: get_type_hierarchy – retrieve super/sub-types of an ABAP class or interface
 *
 * Returns the inheritance hierarchy (superclasses, interfaces implemented,
 * and optionally subclasses) for a given class or interface.
 *
 * ADT endpoint: GET /sap/bc/adt/oo/typeinfo
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerGetTypeHierarchyTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_type_hierarchy',
    'Get the type hierarchy (super/sub-types, implemented interfaces) of an ABAP class or interface.',
    {
      ...sessionOrConnectionShape,
      objectName: z
        .string()
        .describe('Class or interface name (e.g. ZCL_MY_CLASS, ZIF_MY_INTF)'),
      objectType: z
        .enum(['CLAS', 'INTF'])
        .optional()
        .describe(
          'Object type: CLAS (class) or INTF (interface). Auto-detected if omitted.',
        ),
      includeSubTypes: z
        .boolean()
        .optional()
        .describe(
          'Whether to include sub-types (subclasses/implementors) in the result (default: false)',
        ),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const objectName = args.objectName.toUpperCase();

        // Detect type from name if not provided (interfaces often start with ZIF_/IF_)
        let objectType = args.objectType?.toUpperCase() ?? 'CLAS';
        if (!args.objectType) {
          const upper = objectName.toUpperCase();
          if (upper.startsWith('IF_') || upper.startsWith('ZIF_')) {
            objectType = 'INTF';
          }
        }

        const expand = ['superClasses', 'interfaces'];
        if (args.includeSubTypes) {
          expand.push('subClasses');
        }

        const params = new URLSearchParams({
          type: objectType === 'INTF' ? 'INTF/OI' : 'CLAS/OC',
          objectName,
          expand: expand.join(','),
        });

        const result = await client.fetch(
          `/sap/bc/adt/oo/typeinfo?${params.toString()}`,
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
          },
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Get type hierarchy failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
