/**
 * Tool: activate_object – activate one or more ABAP objects
 *
 * CLI equivalent: `adt activate` (from @abapify/adt-export plugin)
 *
 * Posts an activation request to SAP ADT and returns the result.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types.js';
import { connectionShape } from './shared-schemas.js';
import { extractObjectReferences, resolveObjectUriFromType } from './utils.js';

/** Single object descriptor for batch activation */
const objectDescriptor = z.object({
  objectName: z.string().describe('ABAP object name'),
  objectType: z.string().describe('Object type (e.g. PROG, CLAS, INTF)'),
});

export function registerActivateObjectTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'activate_object',
    'Activate one or more ABAP objects. Supply either objectName+objectType for a single object, or the objects array for batch activation.',
    {
      ...connectionShape,
      objectName: z
        .string()
        .optional()
        .describe('ABAP object name (single-object mode)'),
      objectType: z
        .string()
        .optional()
        .describe('Object type (e.g. PROG, CLAS, INTF) (single-object mode)'),
      objects: z
        .array(objectDescriptor)
        .optional()
        .describe('Array of objects to activate (batch mode)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);

        // Build list of {uri, type, name}
        type ObjRef = { uri: string; type: string; name: string };
        const toActivate: ObjRef[] = [];

        const rawObjects =
          args.objects && args.objects.length > 0
            ? args.objects
            : args.objectName && args.objectType
              ? [{ objectName: args.objectName, objectType: args.objectType }]
              : [];

        if (rawObjects.length === 0) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: 'Specify either objectName+objectType or a non-empty objects array',
              },
            ],
          };
        }

        for (const obj of rawObjects) {
          let uri = resolveObjectUriFromType(obj.objectType, obj.objectName);

          if (!uri) {
            const searchResult =
              await client.adt.repository.informationsystem.search.quickSearch({
                query: obj.objectName,
                maxResults: 10,
              });
            const hits = extractObjectReferences(searchResult);
            const match = hits.find(
              (o) =>
                String(o.name ?? '').toUpperCase() ===
                obj.objectName.toUpperCase(),
            );
            if (!match?.uri) {
              return {
                isError: true,
                content: [
                  {
                    type: 'text' as const,
                    text: `Object '${obj.objectName}' not found`,
                  },
                ],
              };
            }
            uri = match.uri;
          }

          toActivate.push({
            uri,
            type: obj.objectType.toUpperCase(),
            name: obj.objectName.toUpperCase(),
          });
        }

        // Build activation XML (matches ADT activation endpoint format)
        const refs = toActivate
          .map(
            (o) =>
              `  <adtcore:objectReference adtcore:uri="${o.uri}" adtcore:type="${o.type}" adtcore:name="${o.name}"/>`,
          )
          .join('\n');

        const activationXml = `<?xml version="1.0" encoding="UTF-8"?>
<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
${refs}
</adtcore:objectReferences>`;

        await client.fetch(
          '/sap/bc/adt/activation?method=activate&preauditRequested=true',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/xml',
              Accept: 'application/xml',
            },
            body: activationXml,
          },
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'activated',
                  count: toActivate.length,
                  objects: toActivate.map((o) => ({
                    name: o.name,
                    type: o.type,
                  })),
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
