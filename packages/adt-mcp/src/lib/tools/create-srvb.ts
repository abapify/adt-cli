/**
 * Tool: create_srvb – create a new RAP Service Binding
 *
 * Thin dedicated tool complementing the generic `create_object` dispatch
 * (which also handles SRVB). SRVB is metadata-only — no source text.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AdkServiceBinding, initializeAdk } from '@abapify/adk';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerCreateSrvbTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'create_srvb',
    'Create a new RAP Service Binding (SRVB) object.',
    {
      ...connectionShape,
      srvbName: z
        .string()
        .describe('SRVB name (uppercase, e.g. ZUI_MY_BINDING)'),
      description: z.string().describe('Short description'),
      packageName: z
        .string()
        .describe('ABAP package to assign the SRVB to (e.g. $TMP)'),
      transport: z
        .string()
        .optional()
        .describe('Transport request number (required for transportable)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        initializeAdk(client);

        await AdkServiceBinding.create(
          args.srvbName,
          args.description,
          args.packageName,
          args.transport ? { transport: args.transport } : undefined,
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'created',
                  objectType: 'SRVB',
                  objectName: args.srvbName.toUpperCase(),
                  description: args.description,
                  packageName: args.packageName.toUpperCase(),
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
              text: `Create SRVB failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
