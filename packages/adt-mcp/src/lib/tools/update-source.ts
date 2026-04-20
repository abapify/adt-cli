/**
 * Tool: update_source – write ABAP source code for an object
 *
 * CLI equivalent: `adt source put <objectName>`
 *
 * Acquires a lock, PUTs the new source, then releases the lock.
 * Uses the adt-locks LockService – no reimplementation of lock protocol.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createLockService } from '@abapify/adt-locks';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import { resolveObjectUri } from './utils';

export function registerUpdateSourceTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'update_source',
    'Write new ABAP source code to an existing object (acquires lock, PUTs source, releases lock)',
    {
      ...sessionOrConnectionShape,
      objectName: z.string().describe('ABAP object name'),
      objectType: z
        .string()
        .optional()
        .describe('Object type (e.g. PROG, CLAS, INTF)'),
      sourceCode: z.string().describe('New ABAP source code'),
      transport: z
        .string()
        .optional()
        .describe(
          'Transport request number (required for transportable objects)',
        ),
    },
    async (args, extra) => {
      let client;
      try {
        ({ client } = await resolveClient(ctx, args, extra ?? {}));
      } catch (error) {
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
      let objectUri: string | undefined;

      try {
        objectUri = await resolveObjectUri(
          client,
          args.objectName,
          args.objectType,
        );
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }

      if (!objectUri) {
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

      const lockService = createLockService(client);
      let lockHandle: string | undefined;

      try {
        // 1. Acquire lock
        const lock = await lockService.lock(objectUri, {
          transport: args.transport,
          objectName: args.objectName,
        });
        lockHandle = lock.handle;

        // 2. PUT source code
        const params = new URLSearchParams();
        params.set('lockHandle', lockHandle);
        if (args.transport) params.set('corrNr', args.transport);

        await client.fetch(`${objectUri}/source/main?${params.toString()}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'text/plain' },
          body: args.sourceCode,
        });

        // 3. Release lock
        await lockService.unlock(objectUri, { lockHandle });
        lockHandle = undefined;

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { status: 'updated', object: args.objectName },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        // Best-effort unlock on failure
        if (lockHandle) {
          try {
            await lockService.unlock(objectUri, { lockHandle });
          } catch {
            // ignore unlock errors in error path
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
