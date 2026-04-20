/**
 * Tools: get_git_types + git_export – abapGit integration
 *
 * get_git_types: list ABAP objects in a package that can be exported via abapGit.
 * git_export: export package contents in abapGit XML format (one file per object).
 *
 * Requires the abapGit ADT plugin installed on the SAP system.
 *
 * ADT endpoints:
 *   GET /sap/bc/adt/abapgit/objects?package={name}   – list exportable objects
 *   GET /sap/bc/adt/abapgit/repos/{name}/export       – export package
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerGetGitTypesTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_git_types',
    'List ABAP objects in a package that are eligible for abapGit export. Requires abapGit installed on the SAP system.',
    {
      ...sessionOrConnectionShape,
      packageName: z
        .string()
        .describe('ABAP package name to inspect (e.g. ZPACKAGE)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const packageName = args.packageName.toUpperCase();

        const params = new URLSearchParams({ package: packageName });
        const result = await client.fetch(
          `/sap/bc/adt/abapgit/objects?${params.toString()}`,
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
          },
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ packageName, objects: result }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Get git types failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}

export function registerGitExportTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'git_export',
    'Export an ABAP package in abapGit XML format. Requires abapGit installed on the SAP system. Returns a map of file paths to their content.',
    {
      ...sessionOrConnectionShape,
      packageName: z
        .string()
        .describe('ABAP package name to export (e.g. ZPACKAGE)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const packageName = args.packageName.toUpperCase();

        const result = await client.fetch(
          `/sap/bc/adt/abapgit/repos/${packageName}/export`,
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
          },
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ packageName, export: result }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Git export failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
