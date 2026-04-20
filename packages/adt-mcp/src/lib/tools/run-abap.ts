/**
 * Tool: run_abap – execute ad-hoc ABAP code snippets
 *
 * Mirrors the CLI `adt abap run <file>` command:
 *
 *   1. Wrap raw source in an IF_OO_ADT_CLASSRUN template (if not already)
 *   2. Create a temporary class in $TMP (or specified package)
 *   3. Lock → write source → unlock
 *   4. Activate
 *   5. POST /sap/bc/adt/oo/classrun/{className} to execute
 *   6. Delete the temp class (unless keepClass)
 *
 * This implementation uses direct contract calls rather than going through
 * the full `AdkClass.create` save flow — MCP is a thin adapter, and the
 * reduced flow keeps mock coverage simple while still exercising every
 * endpoint involved in running ABAP.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createLockService } from '@abapify/adt-locks';
import { initializeAdk } from '@abapify/adk';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

function buildClassTemplate(className: string, body: string): string {
  const lower = className.toLowerCase();
  return `CLASS ${lower} DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    INTERFACES if_oo_adt_classrun.
ENDCLASS.

CLASS ${lower} IMPLEMENTATION.
  METHOD if_oo_adt_classrun~main.
${body
  .split('\n')
  .map((l) => '    ' + l)
  .join('\n')}
  ENDMETHOD.
ENDCLASS.`;
}

function buildClassSource(rawSource: string, className: string): string {
  const upper = rawSource.trimStart().toUpperCase();
  if (upper.startsWith('CLASS ')) return rawSource;
  return buildClassTemplate(className, rawSource);
}

export function registerRunAbapTool(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'run_abap',
    'Execute an ad-hoc ABAP snippet via a temporary IF_OO_ADT_CLASSRUN class. Creates the class, writes the source, activates, executes, then deletes (unless keepClass is true).',
    {
      ...sessionOrConnectionShape,
      source: z
        .string()
        .describe(
          'ABAP source — either a bare method body or a full CLASS definition',
        ),
      className: z
        .string()
        .optional()
        .describe('Temp class name (default: ZCL_ADTCLI_RUN)'),
      packageName: z
        .string()
        .optional()
        .describe('Package for temp class (default: $TMP)'),
      transport: z
        .string()
        .optional()
        .describe('Transport request (not needed for $TMP)'),
      keepClass: z
        .boolean()
        .optional()
        .describe('If true, do not delete the temp class after execution'),
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
              text: `run_abap failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
      // Wire ADK/lockService for ctx.lockService consumers (parity with other tools)
      initializeAdk(client);

      const className = (args.className ?? 'ZCL_ADTCLI_RUN').toUpperCase();
      const packageName = (args.packageName ?? '$TMP').toUpperCase();
      const keepClass = args.keepClass === true;
      const transport = args.transport;
      const classUri = `/sap/bc/adt/oo/classes/${className.toLowerCase()}`;
      const classSource = buildClassSource(args.source, className);

      const lockService = createLockService(client);
      let lockHandle: string | undefined;
      let output = '';
      let executionError: Error | undefined;
      let created = false;
      let classDeleted = false;

      try {
        // 1. Create temp class (POST skeleton)
        try {
          await client.adt.oo.classes.post(
            transport ? { corrNr: transport } : {},
            {
              abapClass: {
                name: className,
                type: 'CLAS/OC',
                description: 'Temporary ADT MCP runner class',
                language: 'EN',
                masterLanguage: 'EN',
                packageRef: {
                  uri: `/sap/bc/adt/packages/${packageName}`,
                  name: packageName,
                  type: 'DEVC/K',
                },
              },
            } as any,
          );
          created = true;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (!msg.includes('already exists') && !msg.includes('422')) {
            throw err;
          }
          // class from a previous run — reuse
        }

        // 2. Lock → write source → unlock
        const lock = await lockService.lock(classUri, {
          transport,
          objectName: className,
          objectType: 'CLAS',
        });
        lockHandle = lock.handle;

        const params = new URLSearchParams();
        params.set('lockHandle', lockHandle);
        if (transport) params.set('corrNr', transport);

        await client.fetch(`${classUri}/source/main?${params.toString()}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'text/plain' },
          body: classSource,
        });

        await lockService.unlock(classUri, { lockHandle });
        lockHandle = undefined;

        // 3. Activate
        await client.adt.activation.activate.post({}, {
          objectReferences: {
            objectReference: [{ uri: classUri, name: className }],
          },
        } as any);

        // 4. Execute
        const result = await client.adt.oo.classrun.post(className);
        output = typeof result === 'string' ? result : String(result ?? '');
      } catch (err) {
        executionError = err instanceof Error ? err : new Error(String(err));
        // Best-effort unlock if still held
        if (lockHandle) {
          try {
            await lockService.unlock(classUri, { lockHandle });
          } catch {
            /* ignore */
          }
        }
      } finally {
        // 5. Cleanup — always try to delete unless keepClass is set
        if (created && !keepClass) {
          try {
            await client.adt.oo.classes.delete(
              className.toLowerCase(),
              transport ? { corrNr: transport } : {},
            );
            classDeleted = true;
          } catch {
            /* ignore cleanup failure */
          }
        }
      }

      if (executionError) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `run_abap failed: ${executionError.message}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ className, output, classDeleted }, null, 2),
          },
        ],
      };
    },
  );
}
