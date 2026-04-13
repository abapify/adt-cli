/**
 * Tool: update_source – write ABAP source code for an object
 *
 * Writes new source code to an existing ABAP object using the ADT
 * lock → PUT source → unlock pattern.
 *
 * Delegates locking to @abapify/adt-locks (no code duplication).
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types.js';
import { connectionShape } from './shared-schemas.js';
import { resolveObjectSourceUrl, resolveObjectUri } from './utils.js';
import { createLockService } from '@abapify/adt-locks';

export function registerUpdateSourceTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'update_source',
    'Update the main ABAP source code for an object (requires lock/unlock cycle)',
    {
      ...connectionShape,
      objectName: z.string().describe('ABAP object name (e.g. ZCL_MY_CLASS)'),
      objectType: z
        .enum(['CLAS', 'INTF', 'PROG', 'FUGR'])
        .describe('ABAP object type'),
      sourceCode: z.string().describe('New ABAP source code to write'),
      transport: z
        .string()
        .optional()
        .describe('Transport request number (e.g. DEVK900001)'),
    },
    async (args) => {
      const objectUri = resolveObjectUri(args.objectName, args.objectType);
      const sourceUrl = resolveObjectSourceUrl(
        args.objectName,
        args.objectType,
      );
      const client = ctx.getClient(args);
      const locks = createLockService(client);
      let lockHandle: string | null = null;

      try {
        // 1. Acquire lock
        const handle = await locks.lock(objectUri, {
          transport: args.transport,
          objectName: args.objectName,
          objectType: args.objectType,
        });
        lockHandle = handle.handle;

        // 2. Refresh ETag by GETting current source
        try {
          await client.fetch(sourceUrl, {
            method: 'GET',
            headers: { Accept: 'text/plain' },
          });
        } catch {
          // ETag refresh is best-effort; continue with PUT
        }

        // 3. PUT new source
        const qs = new URLSearchParams({ lockHandle });
        if (args.transport) qs.set('corrNr', args.transport);

        await client.fetch(`${sourceUrl}?${qs.toString()}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'text/plain' },
          body: args.sourceCode,
        });

        // 4. Unlock
        await locks.unlock(objectUri, { lockHandle });
        lockHandle = null;

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: true,
                  message: `Source of ${args.objectName} (${args.objectType}) updated successfully`,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        // Best-effort unlock on failure
        if (lockHandle !== null) {
          try {
            await locks.unlock(objectUri, { lockHandle });
          } catch {
            // Ignore unlock errors during error recovery
          }
        }

        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Update source failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
