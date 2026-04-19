/**
 * Tool: get_package – get package metadata and optionally its contained objects
 *
 * CLI equivalent: `adt package get <name>` (and `adt get package <name>`)
 *
 * Returns `{ metadata, objects? }`. `objects` is populated only when
 * `includeObjects=true`, using a quickSearch with packageName filter to
 * mirror the CLI behaviour without requiring a global ADK context.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';
import { extractObjectReferences } from './utils';

export function registerGetPackageTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_package',
    'Get metadata for an ABAP package, optionally including its contained objects.',
    {
      ...connectionShape,
      packageName: z.string().describe('Package name (e.g. ZPACKAGE)'),
      includeObjects: z
        .boolean()
        .optional()
        .describe('If true, also list the objects contained in the package.'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const pkgName = args.packageName.toUpperCase();

        const metadata = await client.adt.packages.get(pkgName);

        let objects: ReturnType<typeof extractObjectReferences> | undefined;

        if (args.includeObjects) {
          const searchResult =
            await client.adt.repository.informationsystem.search.quickSearch({
              query: '*',
              packageName: pkgName,
              maxResults: 1000,
            });
          objects = extractObjectReferences(searchResult).filter(
            (o) =>
              o.type !== 'DEVC/K' &&
              (!o.packageName || o.packageName.toUpperCase() === pkgName),
          );
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  packageName: pkgName,
                  metadata,
                  ...(objects ? { objects, count: objects.length } : {}),
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
              text: `Get package failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
