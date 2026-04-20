/**
 * Tool: checkin — push a local abapGit/gCTS directory into SAP.
 *
 * Mirrors the `adt checkin` CLI command. Delegates to `CheckinService`
 * from `@abapify/adt-cli` (single implementation, two surfaces).
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CheckinService } from '@abapify/adt-cli';
import { initializeAdk } from '@abapify/adk';
import { FileLockStore } from '@abapify/adt-locks';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerCheckinTool(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'checkin',
    'Push a local abapGit/gCTS-formatted directory into SAP (inverse of `import_package`). Mirrors `adt checkin`.',
    {
      ...sessionOrConnectionShape,
      sourceDir: z
        .string()
        .describe('Local directory containing serialised files'),
      format: z
        .string()
        .optional()
        .describe("Format id — e.g. 'abapgit' (default) or 'gcts'"),
      rootPackage: z
        .string()
        .optional()
        .describe('Target root SAP package (required for PREFIX folder logic)'),
      transport: z
        .string()
        .optional()
        .describe('Transport request (e.g. DEVK900001)'),
      objectTypes: z
        .array(z.string())
        .optional()
        .describe('Filter to these ABAP types (e.g. ["CLAS","INTF"])'),
      dryRun: z
        .boolean()
        .optional()
        .describe('If true, build the plan but do not modify SAP'),
      activate: z
        .boolean()
        .optional()
        .describe('Activate saved objects after apply (default true)'),
      unlock: z
        .boolean()
        .optional()
        .describe('Force-unlock stale locks owned by current user'),
      abapLanguageVersion: z
        .string()
        .optional()
        .describe("ABAP language version — e.g. '5' for Cloud"),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        initializeAdk(client, { lockStore: new FileLockStore() });

        const service = new CheckinService();
        const result = await service.checkin({
          sourceDir: args.sourceDir,
          format: args.format ?? 'abapgit',
          rootPackage: args.rootPackage,
          transport: args.transport,
          objectTypes: args.objectTypes,
          dryRun: args.dryRun,
          activate: args.activate,
          unlock: args.unlock,
          abapLanguageVersion: args.abapLanguageVersion,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  sourceDir: result.sourceDir,
                  format: result.format,
                  discovered: result.discovered,
                  actions: result.actions,
                  totals: result.apply.totals,
                  aborted: result.aborted,
                  summary: result.summary,
                  groups: result.groups,
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
              text: `checkin failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
