/**
 * Tool: import_package — import all objects in an ABAP package to a local folder.
 *
 * Mirrors the `adt import package` CLI command. Delegates to `ImportService`
 * from `@abapify/adt-cli`.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ImportService } from '@abapify/adt-cli';
import { initializeAdk } from '@abapify/adk';
import { FileLockStore } from '@abapify/adt-locks';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerImportPackageTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'import_package',
    'Recursively import all objects in an ABAP package to a local folder in abapGit format. Mirrors `adt import package`.',
    {
      ...connectionShape,
      packageName: z.string().describe('ABAP package name (e.g. Z_MY_PACKAGE)'),
      outputDir: z
        .string()
        .optional()
        .describe('Target directory (default: ./imported)'),
      recursive: z
        .boolean()
        .optional()
        .describe('Include subpackages (default: true)'),
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
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        initializeAdk(client, { lockStore: new FileLockStore() });

        const service = new ImportService();
        const outputPath = args.outputDir ?? './imported';
        const format = args.format ?? 'abapgit';
        const includeSubpackages = args.recursive ?? true;

        const result = await service.importPackage({
          packageName: args.packageName,
          outputPath,
          includeSubpackages,
          objectTypes: args.objectTypes,
          format,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  packageName: result.packageName,
                  objectCount: result.totalObjects,
                  success: result.results.success,
                  skipped: result.results.skipped,
                  failed: result.results.failed,
                  objectsByType: result.objectsByType,
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
              text: `import_package failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
