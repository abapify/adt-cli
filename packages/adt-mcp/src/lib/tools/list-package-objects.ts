/**
 * Tool: list_package_objects – list ABAP objects in a package
 *
 * CLI equivalent: `adt check --package <name>` (object resolution step)
 *
 * Uses quickSearch with a packageName filter to return all objects in
 * a given package. Reuses the same search pattern as check.ts.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types.js';
import { connectionShape } from './shared-schemas.js';
import { extractObjectReferences } from './utils.js';

export function registerListPackageObjectsTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'list_package_objects',
    'List ABAP objects in a package (optionally filtered by object type)',
    {
      ...connectionShape,
      packageName: z.string().describe('ABAP package name (e.g. ZMYPACKAGE)'),
      objectType: z
        .string()
        .optional()
        .describe('Optional object type filter (e.g. CLAS, PROG, INTF)'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum results to return (default: 200)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const maxResults = args.maxResults ?? 200;

        const results =
          await client.adt.repository.informationsystem.search.quickSearch({
            query: '*',
            maxResults,
            packageName: args.packageName,
            ...(args.objectType ? { objectType: args.objectType } : {}),
          });

        const objects = extractObjectReferences(results);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  packageName: args.packageName,
                  objectType: args.objectType ?? 'all',
                  count: objects.length,
                  objects,
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
              text: `List package objects failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
