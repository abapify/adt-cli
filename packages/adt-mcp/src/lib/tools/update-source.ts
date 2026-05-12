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
import {
  detectMethodBoundary,
  lintSource,
  normalizeMethodBody,
} from '@abapify/adt-lint';
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
      action: z
        .enum(['update', 'editMethod'])
        .optional()
        .default('update')
        .describe(
          'Write mode: update writes full source; editMethod replaces one method body inside a class',
        ),
      methodName: z
        .string()
        .optional()
        .describe('Method name to replace when action=editMethod'),
      sourceCode: z.string().describe('New ABAP source code'),
      lintBeforeWrite: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'When true, run local abaplint pre-check and block write on parser/cloud violations',
        ),
      lintPreset: z
        .enum(['btp', 'onpremise'])
        .optional()
        .describe(
          'Lint preset for lintBeforeWrite gate (btp enables cloud_types checking)',
        ),
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
        let sourceToWrite = args.sourceCode;

        if (args.action === 'editMethod') {
          if (!args.methodName) {
            return {
              isError: true,
              content: [
                {
                  type: 'text' as const,
                  text: 'methodName is required when action=editMethod',
                },
              ],
            };
          }

          if (
            objectUri &&
            !objectUri.includes('/oo/classes/') &&
            !objectUri.includes('/oo/interfaces/')
          ) {
            return {
              isError: true,
              content: [
                {
                  type: 'text' as const,
                  text: `editMethod is only supported for classes and interfaces, but '${args.objectName}' resolved to ${objectUri}`,
                },
              ],
            };
          }

          const currentSource = String(
            await client.fetch(`${objectUri}/source/main`, {
              method: 'GET',
              headers: { Accept: 'text/plain' },
            }),
          );
          const boundary = detectMethodBoundary(currentSource, args.methodName);

          if (!boundary) {
            return {
              isError: true,
              content: [
                {
                  type: 'text' as const,
                  text: `Method ${args.methodName} not found in ${args.objectName}`,
                },
              ],
            };
          }

          const lines = currentSource.split(/\r?\n/);
          const methodBody = normalizeMethodBody(
            args.sourceCode,
            args.methodName,
          );
          const methodBlock = [
            `METHOD ${args.methodName.toUpperCase()}.`,
            methodBody,
            'ENDMETHOD.',
          ].join('\n');

          lines.splice(
            boundary.startLine - 1,
            boundary.endLine - boundary.startLine + 1,
            methodBlock,
          );
          sourceToWrite = lines.join('\n');
        }

        if (args.lintBeforeWrite) {
          const diagnostics = lintSource(sourceToWrite, {
            filename: `${args.objectName.toLowerCase()}.abap`,
            systemType: args.lintPreset,
          });
          const blocking = diagnostics.filter((d) =>
            ['parser_error', 'cloud_types', 'strict_sql'].includes(d.key),
          );
          if (blocking.length > 0) {
            return {
              isError: true,
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    {
                      status: 'blocked_by_lint',
                      diagnostics: blocking,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }
        }

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
          body: sourceToWrite,
        });

        // 3. Release lock
        await lockService.unlock(objectUri, { lockHandle });
        lockHandle = undefined;

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'updated',
                  object: args.objectName,
                  action: args.action ?? 'update',
                },
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
