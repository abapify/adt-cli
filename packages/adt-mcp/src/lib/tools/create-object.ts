/**
 * Tool: create_object – create a new ABAP object
 *
 * Supports creating the most common ABAP object types using the typed ADT contracts:
 * PROG (program), CLAS (class), INTF (interface), FUGR (function group), DEVC (package)
 *
 * Uses the respective typed CRUD contract for each object type so that all
 * XML serialisation goes through the schema pipeline (no manual XML building).
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

/** Object types supported by this tool */
const SUPPORTED_TYPES = ['PROG', 'CLAS', 'INTF', 'FUGR', 'DEVC'] as const;
type SupportedType = (typeof SUPPORTED_TYPES)[number];

function isSupportedType(t: string): t is SupportedType {
  return SUPPORTED_TYPES.includes(t.toUpperCase() as SupportedType);
}

export function registerCreateObjectTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'create_object',
    'Create a new ABAP object. Supported types: PROG (program), CLAS (class), INTF (interface), FUGR (function group). For packages use create_package.',
    {
      ...connectionShape,
      objectName: z
        .string()
        .describe(
          'Name of the new object (uppercase, e.g. ZCL_MY_CLASS, ZPACKAGE)',
        ),
      objectType: z.string().describe('Object type: PROG, CLAS, INTF, or FUGR'),
      description: z.string().describe('Short description of the object'),
      packageName: z
        .string()
        .optional()
        .describe(
          'Package to assign the object to (required for non-local objects)',
        ),
      transport: z
        .string()
        .optional()
        .describe(
          'Transport request number (required for transportable objects)',
        ),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const objectType = args.objectType.toUpperCase();
        const objectName = args.objectName.toUpperCase();

        if (!isSupportedType(objectType)) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Object type '${objectType}' is not supported. Supported types: ${SUPPORTED_TYPES.join(', ')}`,
              },
            ],
          };
        }

        const packageRef = args.packageName
          ? { uri: `/sap/bc/adt/packages/${args.packageName.toUpperCase()}` }
          : undefined;

        const queryOptions = args.transport ? { corrNr: args.transport } : {};

        const commonFields = {
          name: objectName,
          description: args.description,
          language: 'EN',
          masterLanguage: 'EN',
          ...(packageRef ? { packageRef } : {}),
        };

        switch (objectType) {
          case 'PROG':
            await client.adt.programs.programs.post(queryOptions, {
              abapProgram: { ...commonFields, type: 'PROG' },
            });
            break;

          case 'CLAS':
            await client.adt.oo.classes.post(queryOptions, {
              abapClass: { ...commonFields, type: 'CLAS/OC' },
            });
            break;

          case 'INTF':
            await client.adt.oo.interfaces.post(queryOptions, {
              abapInterface: { ...commonFields, type: 'INTF/OI' },
            });
            break;

          case 'FUGR':
            await client.adt.functions.groups.post(queryOptions, {
              abapFunctionGroup: { ...commonFields, type: 'FUGR' },
            });
            break;

          case 'DEVC': {
            const pkgBody = {
              package: {
                name: objectName,
                type: 'DEVC/K',
                description: args.description,
                language: 'EN',
                masterLanguage: 'EN',
                attributes: { packageType: 'development' },
                superPackage: {},
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
            break;
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'created',
                  objectName,
                  objectType,
                  description: args.description,
                  packageName: args.packageName?.toUpperCase(),
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
              text: `Create object failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
