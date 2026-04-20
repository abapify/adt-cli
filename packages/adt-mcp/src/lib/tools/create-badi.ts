/**
 * Tool: create_badi – create a new Enhancement Implementation (ENHO/XHH)
 *
 * ENHO objects host BAdI implementations. On most systems (including
 * BTP Trial) this endpoint requires elevated authorisation — tests
 * therefore exercise it only against the in-process mock.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AdkBadi, initializeAdk } from '@abapify/adk';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerCreateBadiTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'create_badi',
    'Create a new Enhancement Implementation (ENHO/XHH — BAdI container).',
    {
      ...sessionOrConnectionShape,
      badiName: z
        .string()
        .describe('Enhancement Implementation name (uppercase)'),
      description: z.string().describe('Short description'),
      packageName: z
        .string()
        .describe('ABAP package to assign the ENHO to (e.g. $TMP)'),
      transport: z
        .string()
        .optional()
        .describe('Transport request number (required for transportable)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        initializeAdk(client);

        await AdkBadi.create(
          args.badiName,
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
                  objectType: 'ENHO',
                  objectName: args.badiName.toUpperCase(),
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
              text: `Create BAdI failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
