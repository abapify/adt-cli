/**
 * Tool: grep_packages – regex search across all objects in a package (and subpackages)
 *
 * Uses the ADT repository information system search endpoint with
 * userannotation=userwhere and packageName parameter for package-scoped search.
 *
 * ADT endpoint: /sap/bc/adt/repository/informationsystem/search
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerGrepPackagesTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'grep_packages',
    'Regex search for a pattern across all ABAP source code within a package (and optionally its subpackages)',
    {
      ...sessionOrConnectionShape,
      pattern: z.string().describe('Search pattern (regex or literal string)'),
      packageName: z
        .string()
        .describe('ABAP package name to search within (e.g. ZPACKAGE)'),
      includeSubPackages: z
        .boolean()
        .optional()
        .describe('Also search subpackages (default: true)'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results (default: 50)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const maxResults = args.maxResults ?? 50;
        const includeSubPackages = args.includeSubPackages ?? true;

        const params = new URLSearchParams({
          userannotation: 'userwhere',
          query: args.pattern,
          maxResults: String(maxResults),
          packageName: args.packageName.toUpperCase(),
          includeSubpackages: String(includeSubPackages),
        });

        const result = await client.fetch(
          `/sap/bc/adt/repository/informationsystem/search?${params.toString()}`,
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
          },
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  pattern: args.pattern,
                  packageName: args.packageName.toUpperCase(),
                  results: result,
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
              text: `Grep packages failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
