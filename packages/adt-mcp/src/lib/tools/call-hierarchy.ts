/**
 * Tools: get_callers_of + get_callees_of – call hierarchy navigation
 *
 * get_callers_of: traverse the call hierarchy upward (who calls this
 *   method/function/subroutine).
 * get_callees_of: traverse the call hierarchy downward (what does this
 *   method/function/subroutine call).
 *
 * ADT endpoints:
 *   GET /sap/bc/adt/repository/informationsystem/callers
 *   GET /sap/bc/adt/repository/informationsystem/callees
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import { resolveObjectUri } from './utils';

const callHierarchyShape = {
  ...sessionOrConnectionShape,
  objectName: z
    .string()
    .describe('Name of the ABAP object (class, function group, program)'),
  objectType: z
    .string()
    .optional()
    .describe('Object type (e.g. CLAS, FUGR, PROG)'),
  objectUri: z
    .string()
    .optional()
    .describe(
      'Direct ADT URI of the object (skips name resolution if provided)',
    ),
  maxResults: z
    .number()
    .optional()
    .describe('Maximum number of results (default: 50)'),
};

async function fetchCallHierarchy(
  client: ReturnType<ToolContext['getClient']>,
  endpoint: 'callers' | 'callees',
  objectName: string,
  objectType: string | undefined,
  objectUri: string | undefined,
  maxResults: number,
): Promise<{ objectUri: string; result: unknown } | null> {
  const resolvedUri =
    objectUri ?? (await resolveObjectUri(client, objectName, objectType));
  if (!resolvedUri) return null;

  const params = new URLSearchParams({
    objectUri: resolvedUri,
    maxResults: String(maxResults),
  });

  const result = await client.fetch(
    `/sap/bc/adt/repository/informationsystem/${endpoint}?${params.toString()}`,
    { method: 'GET', headers: { Accept: 'application/json' } },
  );

  return { objectUri: resolvedUri, result };
}

type CallHierarchyToolConfig = {
  endpoint: 'callers' | 'callees';
  failureLabel: string;
  resultKey: 'callers' | 'callees';
  toolDescription: string;
  toolName: 'get_callers_of' | 'get_callees_of';
};

function registerCallHierarchyTool(
  server: McpServer,
  ctx: ToolContext,
  config: CallHierarchyToolConfig,
): void {
  server.tool(
    config.toolName,
    config.toolDescription,
    callHierarchyShape,
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const res = await fetchCallHierarchy(
          client,
          config.endpoint,
          args.objectName,
          args.objectType,
          args.objectUri,
          args.maxResults ?? 50,
        );
        if (!res) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Object '${args.objectName}' not found`,
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
                  objectName: args.objectName,
                  objectUri: res.objectUri,
                  [config.resultKey]: res.result,
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
              text: `${config.failureLabel}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}

export function registerGetCallersOfTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  registerCallHierarchyTool(server, ctx, {
    toolName: 'get_callers_of',
    toolDescription:
      'Find all callers (upward call hierarchy) of an ABAP method, function module, or subroutine',
    endpoint: 'callers',
    resultKey: 'callers',
    failureLabel: 'Get callers failed',
  });
}

export function registerGetCalleesOfTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  registerCallHierarchyTool(server, ctx, {
    toolName: 'get_callees_of',
    toolDescription:
      'Find all callees (downward call hierarchy) of an ABAP method, function module, or subroutine',
    endpoint: 'callees',
    resultKey: 'callees',
    failureLabel: 'Get callees failed',
  });
}
