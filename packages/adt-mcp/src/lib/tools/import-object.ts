/**
 * Tool: import_object — import a single ABAP object to the local filesystem.
 *
 * Mirrors the `adt import object` CLI command. Delegates to `ImportService`
 * from `@abapify/adt-cli` so the MCP tool and the CLI stay in lockstep.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ImportService } from '@abapify/adt-cli';
import { initializeAdk } from '@abapify/adk';
import { FileLockStore } from '@abapify/adt-locks';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerImportObjectTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'import_object',
    'Import a single ABAP object (by name) into a local folder in abapGit format. Mirrors `adt import object`.',
    {
      ...sessionOrConnectionShape,
      objectType: z
        .string()
        .describe(
          'ABAP object type (e.g. CLAS, INTF, PROG, FUGR, DOMA). Used as a hint.',
        ),
      objectName: z.string().describe('ABAP object name (case-insensitive)'),
      outputDir: z
        .string()
        .optional()
        .describe(
          'Target directory for the serialised files (default: ./imported)',
        ),
      format: z
        .string()
        .optional()
        .describe("Format plugin name, default 'abapgit'"),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        // ImportService uses the ADK global context to load objects. Each
        // MCP call (re-)initialises it with the per-call client so the
        // server remains stateless.
        initializeAdk(client, { lockStore: new FileLockStore() });

        const service = new ImportService();
        const outputPath = args.outputDir ?? './imported';
        const format = args.format ?? 'abapgit';

        const result = await service.importObject({
          objectName: args.objectName,
          outputPath,
          format,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  objectName: result.objectName,
                  objectType: result.objectType,
                  objectCount: result.results.success,
                  skipped: result.results.skipped,
                  failed: result.results.failed,
                  outputPath: result.outputPath,
                  description: result.description,
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
              text: `import_object failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
