/**
 * Tool: activate_package – batch-activate all inactive objects in a package
 *
 * 1. Lists inactive objects in the package via GET /sap/bc/adt/activation/inactive_objects
 * 2. Activates them all in a single batch POST to /sap/bc/adt/activation
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';
import { extractObjectReferences } from './utils';
import type { InferTypedSchema } from '@abapify/adt-schemas';
import { adtcore } from '@abapify/adt-schemas';

type ObjectReferencesBody = Extract<
  InferTypedSchema<typeof adtcore>,
  { objectReferences: unknown }
>;

export function registerActivatePackageTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'activate_package',
    'Batch-activate all inactive objects in a package. Returns the count and list of activated objects.',
    {
      ...connectionShape,
      packageName: z.string().describe('ABAP package name (e.g. ZPACKAGE)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const packageName = args.packageName.toUpperCase();

        // Step 1: Get list of inactive objects in the package
        const params = new URLSearchParams({ packageName });
        const inactiveResult = await client.fetch(
          `/sap/bc/adt/activation/inactive_objects?${params.toString()}`,
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
          },
        );

        const objects = extractObjectReferences(inactiveResult);

        if (objects.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    status: 'no_inactive_objects',
                    packageName,
                    message: 'No inactive objects found in this package',
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        // Step 2: Activate all inactive objects in a single batch call
        const body: ObjectReferencesBody = {
          objectReferences: {
            objectReference: objects.map((o) => ({
              uri: o.uri ?? '',
              type: o.type ?? '',
              name: (o.name ?? '').toUpperCase(),
            })),
          },
        };

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
                  packageName,
                  count: objects.length,
                  objects: objects.map((o) => ({
                    name: o.name,
                    type: o.type,
                    uri: o.uri,
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
              text: `Activate package failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
