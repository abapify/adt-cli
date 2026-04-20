/**
 * Tool: cts_search_transports – search transport requests with filters
 *
 * CLI equivalent: `adt cts search`
 *
 * Endpoint: GET /sap/bc/adt/cts/transports?_action=FIND
 * Filters supported: user (owner), trfunction (type), status (client-side).
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import {
  normalizeTransportFindResponse,
  type CtsReqHeader,
} from '@abapify/adt-contracts';

export function registerCtsSearchTransportsTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'cts_search_transports',
    'Search transport requests via /sap/bc/adt/cts/transports?_action=FIND. Filters: user (owner), trfunction (K/W/T/*), status (D/R/L/... client-side filter).',
    {
      ...sessionOrConnectionShape,
      user: z
        .string()
        .optional()
        .describe('Owner filter – username or * for all (default: *)'),
      trfunction: z
        .string()
        .optional()
        .describe(
          'Transport function filter – K=workbench, W=customizing, T=copies, * for all (default: *)',
        ),
      status: z
        .string()
        .optional()
        .describe(
          'Optional client-side filter on TRSTATUS (e.g. D=Modifiable, R=Released)',
        ),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results (default: 50)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const rawResult = await client.adt.cts.transports.find({
          _action: 'FIND',
          user: args.user ?? '*',
          trfunction: (args.trfunction ?? '*') as string,
        });
        // ts-xsd may preserve the XSD root element name (`abap`) as an outer
        // wrapper depending on schema shape. Try both shapes before
        // normalising so the tool is robust to small schema changes.
        const result = (rawResult as { abap?: unknown })?.abap ?? rawResult;
        let transports: CtsReqHeader[] = normalizeTransportFindResponse(result);
        if (args.status) {
          transports = transports.filter((t) => t.TRSTATUS === args.status);
        }
        const maxResults = args.maxResults ?? 50;
        const display = transports.slice(0, maxResults);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { count: transports.length, transports: display },
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
              text: `Search transports failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
