/**
 * Tool: delete_object – delete an ABAP object
 *
 * Deletes an ABAP object using the appropriate typed CRUD contract.
 * Supports the same types as create_object: PROG, CLAS, INTF, FUGR, DEVC.
 *
 * For other object types, falls back to resolving the URI and using
 * a direct DELETE request.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { initializeAdk } from '@abapify/adk';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';
import { resolveObjectUri } from './utils';

type AdtClient = ReturnType<ToolContext['getClient']>;
type QueryOptions = { corrNr?: string };
type DeleteOperation = (
  client: AdtClient,
  objectName: string,
  queryOptions: QueryOptions,
) => Promise<void>;

const deleteOperations: Record<string, DeleteOperation> = {
  PROG: (client, objectName, queryOptions) =>
    client.adt.programs.programs.delete(objectName.toLowerCase(), queryOptions),
  INCL: (client, objectName, queryOptions) =>
    client.adt.programs.includes.delete(objectName.toLowerCase(), queryOptions),
  CLAS: (client, objectName, queryOptions) =>
    client.adt.oo.classes.delete(objectName.toLowerCase(), queryOptions),
  INTF: (client, objectName, queryOptions) =>
    client.adt.oo.interfaces.delete(objectName.toLowerCase(), queryOptions),
  FUGR: (client, objectName, queryOptions) =>
    client.adt.functions.groups.delete(objectName.toLowerCase(), queryOptions),
  DEVC: (client, objectName, queryOptions) =>
    client.adt.packages.delete(objectName, queryOptions),
  DOMA: (client, objectName, queryOptions) =>
    client.adt.ddic.domains.delete(objectName.toLowerCase(), queryOptions),
  DTEL: (client, objectName, queryOptions) =>
    client.adt.ddic.dataelements.delete(objectName.toLowerCase(), queryOptions),
  TABL: (client, objectName, queryOptions) =>
    client.adt.ddic.tables.delete(objectName.toLowerCase(), queryOptions),
  STRUCT: (client, objectName, queryOptions) =>
    client.adt.ddic.structures.delete(objectName.toLowerCase(), queryOptions),
  DDLS: (client, objectName, queryOptions) =>
    client.adt.ddic.ddl.sources.delete(objectName.toLowerCase(), queryOptions),
  DCLS: (client, objectName, queryOptions) =>
    client.adt.ddic.dcl.sources.delete(objectName.toLowerCase(), queryOptions),
  BDEF: (client, objectName, queryOptions) =>
    client.adt.bo.behaviordefinitions.delete(
      objectName.toLowerCase(),
      queryOptions,
    ),
  SRVD: (client, objectName, queryOptions) =>
    client.adt.ddic.srvd.sources.delete(objectName.toLowerCase(), queryOptions),
};

function getDeleteOperation(objectType?: string): DeleteOperation | undefined {
  return objectType ? deleteOperations[objectType] : undefined;
}

async function deleteByResolvedUri(
  client: AdtClient,
  objectName: string,
  objectType: string | undefined,
  transport: string | undefined,
): Promise<boolean> {
  const uri = await resolveObjectUri(client, objectName, objectType);
  if (!uri) {
    return false;
  }

  const params = new URLSearchParams();
  if (transport) {
    params.set('corrNr', transport);
  }

  const queryString = params.toString();
  const deleteUri = queryString ? `${uri}?${queryString}` : uri;
  await client.fetch(deleteUri, { method: 'DELETE' });
  return true;
}

export function registerDeleteObjectTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'delete_object',
    'Delete an ABAP object. Supports PROG, INCL, CLAS, INTF, FUGR, DEVC, DOMA, DTEL, TABL, STRUCT, DDLS, DCLS, BDEF, SRVD and falls back to direct URI deletion for other types.',
    {
      ...connectionShape,
      objectName: z.string().describe('Name of the ABAP object to delete'),
      objectType: z
        .string()
        .optional()
        .describe('Object type (e.g. CLAS, PROG, INTF, FUGR, DEVC)'),
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
        // Initialise ADK so any internal helper using the global context
        // (e.g. lock service lookups) has a live client. See the parity
        // note in `object-creation.ts`.
        initializeAdk(client);

        const objectName = args.objectName.toUpperCase();
        const objectType = args.objectType?.toUpperCase();
        const queryOptions = args.transport ? { corrNr: args.transport } : {};

        const deleteOperation = getDeleteOperation(objectType);
        if (deleteOperation) {
          await deleteOperation(client, objectName, queryOptions);
        } else {
          const deleted = await deleteByResolvedUri(
            client,
            objectName,
            objectType,
            args.transport,
          );
          if (!deleted) {
            return {
              isError: true,
              content: [
                {
                  type: 'text' as const,
                  text: `Object '${objectName}' not found`,
                },
              ],
            };
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { status: 'deleted', objectName, objectType },
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
              text: `Delete object failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
