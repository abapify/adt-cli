/**
 * Tool: create_package – create a new ABAP development package (DEVC)
 *
 * Dedicated tool for package creation with package-specific options:
 * - packageType: 'development' (default), 'structure', or 'main'
 * - parentPackage: super-package URI
 * - Transport (optional, omit for local $TMP packages)
 *
 * ADT endpoint: POST /sap/bc/adt/packages
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerCreatePackageTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'create_package',
    'Create a new ABAP development package (DEVC). Omit transport for local ($TMP) packages.',
    {
      ...sessionOrConnectionShape,
      packageName: z
        .string()
        .describe('Package name (e.g. ZPACKAGE, $TMP_TEST)'),
      description: z.string().describe('Short description of the package'),
      parentPackage: z
        .string()
        .optional()
        .describe(
          'Parent package name (e.g. ZROOT). If omitted the package is created at the top level.',
        ),
      packageType: z
        .enum(['development', 'structure', 'main'])
        .optional()
        .describe('Package type (default: development)'),
      transport: z
        .string()
        .optional()
        .describe(
          'Transport request number. Omit for local packages (e.g. $-prefixed names).',
        ),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const packageName = args.packageName.toUpperCase();
        const packageType = args.packageType ?? 'development';

        const queryOptions = args.transport ? { corrNr: args.transport } : {};

        const pkgBody = {
          package: {
            name: packageName,
            type: 'DEVC/K',
            description: args.description,
            language: 'EN',
            masterLanguage: 'EN',
            attributes: { packageType },
            superPackage: args.parentPackage
              ? {
                  uri: `/sap/bc/adt/packages/${args.parentPackage.toUpperCase()}`,
                }
              : {},
            extensionAlias: {},
            switch: {},
            applicationComponent: {},
            transport: {},
            translation: {},
            useAccesses: {},
            packageInterfaces: {},
            subPackages: {},
          },
        };

        await client.adt.packages.post(queryOptions, pkgBody);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'created',
                  packageName,
                  packageType,
                  description: args.description,
                  parentPackage: args.parentPackage?.toUpperCase(),
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
              text: `Create package failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
