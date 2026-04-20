/**
 * Tool: cts_create_transport – create a new transport request
 *
 * CLI equivalent: `adt cts tr create`
 *
 * Uses the transportrequests.create() contract with the transportmanagmentCreate schema
 * to build and POST the XML request body.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import type { InferTypedSchema } from '@abapify/adt-schemas';
import { transportmanagmentCreate } from '@abapify/adt-schemas';

type CreateBody = InferTypedSchema<typeof transportmanagmentCreate>;

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;
}

function getStringField(
  value: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const rawValue = value?.[key];
  return typeof rawValue === 'string' ? rawValue : undefined;
}

export function registerCtsCreateTransportTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'cts_create_transport',
    'Create a new transport request',
    {
      ...sessionOrConnectionShape,
      description: z.string().describe('Transport description'),
      type: z
        .enum(['K', 'W'])
        .optional()
        .describe(
          'Transport type: K (Workbench) or W (Customizing). Default: K',
        ),
      target: z.string().optional().describe('Target system'),
      project: z.string().optional().describe('CTS project name'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});

        const body: CreateBody = {
          root: {
            request: {
              desc: args.description,
              type: args.type ?? 'K',
              ...(args.target ? { target: args.target } : {}),
              ...(args.project ? { cts_project: args.project } : {}),
            },
          },
        };

        const response = await client.adt.cts.transportrequests.create(body);

        // Extract transport number from response
        const data = getRecord(response);
        const request =
          getRecord(getRecord(data?.root)?.request) ??
          getRecord(data?.request) ??
          data;
        const transportNumber =
          getStringField(request, 'trkorr') ??
          getStringField(request, 'number') ??
          '';

        if (!transportNumber) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Create transport failed: transport number missing in response ${JSON.stringify(response)}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'created',
                  transport: transportNumber,
                  description: args.description,
                  type: args.type ?? 'K',
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
              text: `Create transport failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
