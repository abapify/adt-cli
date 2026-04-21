/**
 * Tool: publish_service_binding – publish/unpublish a RAP Service Binding
 *
 * Retained for backward compatibility with the pre-E12 MCP surface.
 * As of E12 this tool now delegates to the typed
 * `client.adt.businessservices.bindings.publish/unpublish` contract
 * instead of a raw `client.fetch()` call. Prefer the dedicated
 * `unpublish_srvb` tool for new integrations.
 *
 * ADT endpoint: POST/DELETE /sap/bc/adt/businessservices/bindings/{name}/publishedstates
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AdkServiceBinding, initializeAdk } from '@abapify/adk';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerPublishServiceBindingTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'publish_service_binding',
    'Publish (or unpublish) a RAP Service Binding (SRVB) in SAP. Pass `unpublish: true` to deactivate. Delegates to the typed SRVB contract.',
    {
      ...sessionOrConnectionShape,
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
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        initializeAdk(client);

        const bindingName = args.bindingName.toUpperCase();

        if (args.unpublish) {
          await AdkServiceBinding.unpublish(bindingName);
        } else {
          await AdkServiceBinding.publish(bindingName);
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: args.unpublish ? 'unpublished' : 'published',
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
