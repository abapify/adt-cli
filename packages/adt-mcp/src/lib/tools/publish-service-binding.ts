/**
 * Tool: publish_service_binding – publish an OData service binding in the SAP system
 *
 * Activates and publishes an OData V2 or V4 service binding, making it
 * accessible via the SAP Gateway. Requires an existing SRVB object.
 *
 * ADT endpoint: POST /sap/bc/adt/businessservices/bindings/{name}/publishedstates
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerPublishServiceBindingTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'publish_service_binding',
    'Publish (activate) an OData service binding (SRVB) in SAP to make it accessible via the Gateway.',
    {
      ...connectionShape,
      bindingName: z
        .string()
        .describe('Service binding name (e.g. ZUI_MYAPP_O4)'),
      unpublish: z
        .boolean()
        .optional()
        .describe(
          'If true, unpublishes (deactivates) the service binding instead (default: false)',
        ),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const bindingName = args.bindingName.toUpperCase();
        const action = args.unpublish ? 'unpublish' : 'publish';

        if (args.unpublish) {
          // DELETE from publishedstates to unpublish
          await client.fetch(
            `/sap/bc/adt/businessservices/bindings/${bindingName}/publishedstates`,
            {
              method: 'DELETE',
              headers: { Accept: 'application/json' },
            },
          );
        } else {
          // POST to publishedstates to publish
          await client.fetch(
            `/sap/bc/adt/businessservices/bindings/${bindingName}/publishedstates`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify({ bindingName }),
            },
          );
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: action === 'publish' ? 'published' : 'unpublished',
                  bindingName,
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
              text: `Publish service binding failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
