/**
 * Tool: activate_object – activate one or more ABAP objects
 *
 * CLI equivalent: activation step in `adt import`
 *
 * Activates objects via the ADT activation endpoint.
 * Supports single object or batch activation.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types.js';
import { connectionShape } from './shared-schemas.js';
import { resolveObjectUri, type SourceObjectType } from './utils.js';

const ACTIVATION_URL =
  '/sap/bc/adt/activation?method=activate&preauditRequested=true';

/** Build the activation XML payload for a list of objects */
function buildActivationXml(
  objects: Array<{ uri: string; type: string; name: string }>,
): string {
  const refs = objects
    .map(
      (o) =>
        `  <adtcore:objectReference adtcore:uri="${o.uri}" adtcore:type="${o.type}" adtcore:name="${o.name.toUpperCase()}"/>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
${refs}
</adtcore:objectReferences>`;
}

export function registerActivateObjectTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'activate_object',
    'Activate one or more ABAP objects (single or batch)',
    {
      ...connectionShape,
      objectName: z
        .string()
        .optional()
        .describe('ABAP object name for single-object activation'),
      objectType: z
        .enum(['CLAS', 'INTF', 'PROG', 'FUGR'])
        .optional()
        .describe('ABAP object type for single-object activation'),
      objects: z
        .array(
          z.object({
            name: z.string().describe('Object name'),
            type: z
              .enum(['CLAS', 'INTF', 'PROG', 'FUGR'])
              .describe('Object type'),
          }),
        )
        .optional()
        .describe('List of objects to activate in batch'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);

        // Collect objects to activate
        const toActivate: Array<{ uri: string; type: string; name: string }> =
          [];

        if (args.objectName && args.objectType) {
          const uri = resolveObjectUri(
            args.objectName,
            args.objectType as SourceObjectType,
          );
          toActivate.push({
            uri,
            type: args.objectType,
            name: args.objectName,
          });
        }

        if (args.objects && args.objects.length > 0) {
          for (const obj of args.objects) {
            const uri = resolveObjectUri(
              obj.name,
              obj.type as SourceObjectType,
            );
            toActivate.push({ uri, type: obj.type, name: obj.name });
          }
        }

        if (toActivate.length === 0) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: 'No objects to activate. Provide objectName+objectType or objects array.',
              },
            ],
          };
        }

        const xml = buildActivationXml(toActivate);

        await client.fetch(ACTIVATION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml',
            Accept: 'application/xml',
          },
          body: xml,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: true,
                  activated: toActivate.map((o) => ({
                    name: o.name,
                    type: o.type,
                  })),
                  message: `${toActivate.length} object(s) activated successfully`,
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
              text: `Activation failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
