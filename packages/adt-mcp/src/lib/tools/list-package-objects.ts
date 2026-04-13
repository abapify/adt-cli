/**
 * Tool: list_package_objects – list ABAP objects in a package
 *
 * CLI equivalent: `adt get package <name> --objects`
 *
 * Uses quickSearch with packageName filter – same pattern as resolvePackageObjects
 * in packages/adt-cli/src/lib/commands/check.ts.
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
    'List ABAP objects contained in a package (uses quickSearch with packageName filter)',
    {
      ...connectionShape,
      packageName: z.string().describe('Package name (e.g. ZPACKAGE)'),
      objectType: z
        .string()
        .optional()
        .describe('Filter by object type (e.g. CLAS, PROG, INTF)'),
      maxResults: z
        .number()
        .optional()
        .default(200)
        .describe('Maximum number of results (default: 200)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);

        const searchResult =
          await client.adt.repository.informationsystem.search.quickSearch({
            query: '*',
            maxResults: args.maxResults ?? 200,
            packageName: args.packageName,
            ...(args.objectType ? { objectType: args.objectType } : {}),
          });

        const objects = extractObjectReferences(searchResult).filter(
          (o) =>
            // Exclude the package itself (DEVC) and objects from other packages
            o.type !== 'DEVC/K' &&
            (!o.packageName ||
              o.packageName.toUpperCase() === args.packageName.toUpperCase()),
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  packageName: args.packageName,
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
