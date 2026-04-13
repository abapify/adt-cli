/**
 * Tool: clone_object – copy an ABAP object to a new name
 *
 * Creates a new object of the same type, copies the source code from the
 * original, and optionally activates the clone.
 *
 * Supports PROG, CLAS, INTF (source-based objects). For other types falls
 * back to an error asking for manual creation.
 *
 * ADT approach: create new object → copy source → activate clone
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createLockService } from '@abapify/adt-locks';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';
import { resolveObjectUri, resolveObjectUriFromType } from './utils';

const CLONABLE_TYPES = ['PROG', 'CLAS', 'INTF'] as const;
type ClonableType = (typeof CLONABLE_TYPES)[number];

function isClonableType(t: string): t is ClonableType {
  return CLONABLE_TYPES.includes(t.toUpperCase() as ClonableType);
}

async function getSourceCode(
  client: ReturnType<ToolContext['getClient']>,
  objectType: ClonableType,
  objectName: string,
): Promise<string> {
  const name = objectName.toLowerCase();
  switch (objectType) {
    case 'PROG':
      return (await client.adt.programs.programs.source.main.get(
        name,
      )) as string;
    case 'CLAS':
      return (await client.adt.oo.classes.source.main.get(name)) as string;
    case 'INTF':
      return (await client.adt.oo.interfaces.source.main.get(name)) as string;
  }
}

async function createNewObject(
  client: ReturnType<ToolContext['getClient']>,
  objectType: ClonableType,
  objectName: string,
  description: string,
  packageName: string | undefined,
  transport: string | undefined,
): Promise<void> {
  const packageRef = packageName
    ? { uri: `/sap/bc/adt/packages/${packageName.toUpperCase()}` }
    : undefined;
  const queryOptions = transport ? { corrNr: transport } : {};
  const commonFields = {
    name: objectName.toUpperCase(),
    description,
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
  }
}

export function registerCloneObjectTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'clone_object',
    'Copy an ABAP object to a new name. Supported types: PROG, CLAS, INTF. Creates the new object and copies the source code.',
    {
      ...connectionShape,
      sourceObjectName: z
        .string()
        .describe('Name of the source object to copy'),
      sourceObjectType: z
        .string()
        .describe('Object type of the source: PROG, CLAS, or INTF'),
      targetObjectName: z.string().describe('Name for the new (cloned) object'),
      targetDescription: z
        .string()
        .optional()
        .describe(
          'Description for the clone (defaults to source description with "Copy of" prefix)',
        ),
      targetPackage: z
        .string()
        .optional()
        .describe('Package for the clone (defaults to same package as source)'),
      transport: z
        .string()
        .optional()
        .describe('Transport request number for the clone'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const sourceType = args.sourceObjectType.toUpperCase().split('/')[0];
        const sourceName = args.sourceObjectName.toUpperCase();
        const targetName = args.targetObjectName.toUpperCase();

        if (!isClonableType(sourceType)) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Object type '${sourceType}' is not supported for cloning. Supported types: ${CLONABLE_TYPES.join(', ')}`,
              },
            ],
          };
        }

        // 1. Get source object metadata (for description)
        const sourceUri = resolveObjectUriFromType(sourceType, sourceName);
        let description = args.targetDescription ?? `Copy of ${sourceName}`;
        if (!args.targetDescription && sourceUri) {
          try {
            const meta = (await client.fetch(sourceUri, {
              method: 'GET',
              headers: { Accept: 'application/json' },
            })) as Record<string, unknown>;
            const desc =
              (meta as Record<string, Record<string, string>>)?.abapClass
                ?.description ??
              (meta as Record<string, Record<string, string>>)?.abapProgram
                ?.description ??
              (meta as Record<string, Record<string, string>>)?.abapInterface
                ?.description;
            if (desc) description = `Copy of ${String(desc)}`;
          } catch {
            // ignore metadata fetch failure, use default description
          }
        }

        // 2. Get source code
        const sourceCode = await getSourceCode(client, sourceType, sourceName);

        // 3. Create the target object
        await createNewObject(
          client,
          sourceType,
          targetName,
          description,
          args.targetPackage,
          args.transport,
        );

        // 4. Copy the source code to the clone
        const resolvedTargetUri =
          resolveObjectUriFromType(sourceType, targetName) ??
          (await resolveObjectUri(client, targetName, sourceType));

        if (!resolvedTargetUri) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Could not resolve URI for target object '${targetName}'`,
              },
            ],
          };
        }

        const lockService = createLockService(client);
        const lockHandle = await lockService.lock(resolvedTargetUri, {
          transport: args.transport,
          objectName: targetName,
          objectType: sourceType,
        });

        try {
          const putParams = new URLSearchParams({
            lockHandle: lockHandle.handle,
            ...(args.transport ? { corrNr: args.transport } : {}),
          });

          await client.fetch(
            `${resolvedTargetUri}/source/main?${putParams.toString()}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'text/plain' },
              body: sourceCode,
            },
          );
        } finally {
          await lockService.unlock(resolvedTargetUri, {
            lockHandle: lockHandle.handle,
          });
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'cloned',
                  sourceObject: { name: sourceName, type: sourceType },
                  targetObject: {
                    name: targetName,
                    type: sourceType,
                    description,
                    uri: resolvedTargetUri,
                  },
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
              text: `Clone object failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
