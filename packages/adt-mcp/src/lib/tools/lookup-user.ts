/**
 * Tool: lookup_user – look up SAP system users
 *
 * CLI equivalent: `adt user [query]`
 *
 * - No query → returns the currently authenticated user (via systeminformation)
 * - Exact username → GET /sap/bc/adt/system/users/{username}
 * - Wildcard query (contains * or ?) → GET /sap/bc/adt/system/users?querystring=…
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createUserService } from '@abapify/adt-client';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerLookupUserTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'lookup_user',
    'Look up SAP system users. Empty query returns the current user; exact username returns a single user; wildcard query (with * or ?) searches.',
    {
      ...connectionShape,
      query: z
        .string()
        .optional()
        .describe(
          'Username (exact) or wildcard search (e.g. DEV*). Empty returns the current user.',
        ),
      maxResults: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Max results for wildcard searches (default: 50).'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const userService = createUserService(client.adt);

        const query = args.query?.trim();

        if (!query) {
          const current = await userService.getCurrentUser();
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  { mode: 'current', user: current },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        if (!query.includes('*') && !query.includes('?')) {
          const users = await userService.getUserByName(query);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  { mode: 'exact', query, count: users.length, users },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        const users = await userService.searchUsers(
          query,
          args.maxResults ?? 50,
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { mode: 'search', query, count: users.length, users },
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
              text: `Lookup user failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
