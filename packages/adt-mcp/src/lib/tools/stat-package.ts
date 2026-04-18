/**
 * Tool: stat_package – check whether an ABAP package exists
 *
 * CLI equivalent: `adt package stat <name>`
 *
 * Calls GET /sap/bc/adt/packages/{name} and returns `{ exists, metadata? }`.
 * A 404 (or any failure that looks like "not found") is translated to
 * `{ exists: false }` – other errors are re-thrown.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

function isNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /\b404\b/.test(msg) ||
    /not\s*found/i.test(msg) ||
    /does not exist/i.test(msg)
  );
}

export function registerStatPackageTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'stat_package',
    'Check whether an ABAP package exists. Returns { exists, metadata? }.',
    {
      ...connectionShape,
      packageName: z.string().describe('Package name (e.g. ZPACKAGE)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        try {
          const metadata = await client.adt.packages.get(
            args.packageName.toUpperCase(),
          );
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({ exists: true, metadata }, null, 2),
              },
            ],
          };
        } catch (err) {
          if (isNotFoundError(err)) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({ exists: false }, null, 2),
                },
              ],
            };
          }
          throw err;
        }
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Stat package failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
