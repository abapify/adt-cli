/**
 * Tool: get_object_structure – retrieve the structural tree of an ABAP object
 *
 * Returns the object explorer tree including includes, methods, attributes,
 * and other sub-elements depending on the object type.
 *
 * ADT endpoint: GET {objectUri}/objectstructure
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import { resolveObjectUriFromType, resolveObjectUri } from './utils';

/**
 * Dispatch to the appropriate typed CRUD contract's objectstructure() method
 * based on the object type, or fall back to a raw fetch if unknown.
 */
async function fetchObjectStructure(
  client: ReturnType<ToolContext['getClient']>,
  objectName: string,
  objectType: string | undefined,
  version?: 'active' | 'inactive',
): Promise<unknown> {
  const name = objectName.toLowerCase();
  const type = objectType?.toUpperCase().split('/')[0];

  const structureOptions = version ? { version } : {};

  switch (type) {
    case 'PROG':
      return client.adt.programs.programs.objectstructure(
        name,
        structureOptions,
      );
    case 'CLAS':
      return client.adt.oo.classes.objectstructure(name, structureOptions);
    case 'INTF':
      return client.adt.oo.interfaces.objectstructure(name, structureOptions);
    case 'FUGR':
      return client.adt.functions.groups.objectstructure(
        name,
        structureOptions,
      );
    default: {
      // Generic fallback: resolve URI and fetch /objectstructure
      const uri =
        type && resolveObjectUriFromType(type, objectName)
          ? resolveObjectUriFromType(type, objectName)
          : await resolveObjectUri(client, objectName, objectType);

      if (!uri) throw new Error(`Object '${objectName}' not found`);

      const params = version ? `?version=${version}` : '';
      return client.fetch(`${uri}/objectstructure${params}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
    }
  }
}

export function registerGetObjectStructureTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_object_structure',
    'Get the structural tree of an ABAP object (includes, methods, attributes, sub-components).',
    {
      ...sessionOrConnectionShape,
      objectName: z.string().describe('ABAP object name'),
      objectType: z
        .string()
        .optional()
        .describe('Object type (e.g. CLAS, PROG, INTF, FUGR)'),
      version: z
        .enum(['active', 'inactive'])
        .optional()
        .describe('Object version to inspect (default: active)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});

        const result = await fetchObjectStructure(
          client,
          args.objectName,
          args.objectType,
          args.version,
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
              text: `Get object structure failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
