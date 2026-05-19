/**
 * Tool: import_transport — export all objects referenced by a transport request.
 *
 * Mirrors the `adt import transport` CLI command. Delegates to `ImportService`
 * from `@abapify/adt-cli`.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ImportService } from '@abapify/adt-cli';
import { initializeAdk } from '@abapify/adk';
import { FileLockStore } from '@abapify/adt-locks';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerImportTransportTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'import_transport',
    'Export all objects referenced by a transport request to a local folder. Mirrors `adt import transport`.',
    {
      ...sessionOrConnectionShape,
      transportNumber: z
        .string()
        .describe('Transport request number (e.g. DEVK900123)'),
      outputDir: z
        .string()
        .optional()
        .describe('Target directory (default: ./imported)'),
      format: z
        .string()
        .optional()
        .describe("Format plugin name, default 'abapgit'"),
      objectTypes: z
        .array(z.string())
        .optional()
        .describe(
          'Optional list of object types to filter (e.g. ["CLAS","INTF"])',
        ),
      applyDeletions: z
        .boolean()
        .optional()
        .describe(
          'Whether to remove local files for objects marked with obj_func=D (default: true)',
        ),
      deletionObjFunc: z
        .string()
        .optional()
        .describe('Object function code(s) that trigger deletion (default: D)'),
      deletionPgmid: z
        .string()
        .optional()
        .describe('Program ID filter for deletion objects (default: R3TR)'),
      alsoTransports: z
        .array(z.string())
        .optional()
        .describe('Additional transport numbers to merge into the import'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        initializeAdk(client, { lockStore: new FileLockStore() });

        const service = new ImportService();
        const outputPath = args.outputDir ?? './imported';
        const format = args.format ?? 'abapgit';

        const result = await service.importTransport({
          transportNumber: args.transportNumber,
          outputPath,
          objectTypes: args.objectTypes,
          format,
          applyDeletions: args.applyDeletions,
          deletionObjFunc: args.deletionObjFunc,
          deletionPgmid: args.deletionPgmid,
          alsoTransports: args.alsoTransports,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  transportNumber: result.transportNumber,
                  objectCount: result.totalObjects,
                  success: result.results.success,
                  skipped: result.results.skipped,
                  failed: result.results.failed,
                  deleted: result.results.deleted,
                  objectsByType: result.objectsByType,
                  outputPath: result.outputPath,
                  description: result.description,
                  filesRemoved: result.filesRemoved,
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
              text: `import_transport failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
