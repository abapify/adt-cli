/**
 * Tool: activate_object – activate one or more ABAP objects
 *
 * CLI equivalent: `adt activate` (from @abapify/adt-export plugin)
 *
 * Posts an adtcore:objectReferences body to the activation endpoint via the
 * typed activation contract. Uses the `adtcore` schema (from adt-contracts) for
 * request serialisation – no manual XML string building.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import { resolveObjectUri } from './utils';
import type { InferTypedSchema } from '@abapify/adt-schemas';
import { adtcore } from '@abapify/adt-schemas';

/** objectReferences variant of InferTypedSchema<typeof adtcore> */
type ObjectReferencesBody = Extract<
  InferTypedSchema<typeof adtcore>,
  { objectReferences: unknown }
>;

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
      ...sessionOrConnectionShape,
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
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});

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
          const uri = await resolveObjectUri(
            client,
            obj.objectName,
            obj.objectType,
          );

          if (!uri) {
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

          toActivate.push({
            uri,
            type: obj.objectType.toUpperCase(),
            name: obj.objectName.toUpperCase(),
          });
        }

        // Build typed request body – schema.build() (called by the adapter) serialises to XML
        const body: ObjectReferencesBody = {
          objectReferences: {
            objectReference: toActivate.map((o) => ({
              uri: o.uri,
              type: o.type,
              name: o.name,
            })),
          },
        };

        // Use the typed activation contract – adapter calls adtcore.build(body) for the request
        await client.adt.activation.activate.post(
          { method: 'activate', preauditRequested: true },
          body,
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
