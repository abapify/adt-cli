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
import {
  createAdtObject,
  isSourceBackedObjectType,
  SOURCE_BACKED_OBJECT_TYPES,
  type SourceBackedObjectType,
} from './object-creation';
import { connectionShape } from './shared-schemas';
import { resolveObjectUri, resolveObjectUriFromType } from './utils';

async function getSourceCode(
  client: ReturnType<ToolContext['getClient']>,
  objectType: SourceBackedObjectType,
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

async function resolveCloneDescription(
  client: ReturnType<ToolContext['getClient']>,
  sourceType: SourceBackedObjectType,
  sourceName: string,
  targetDescription?: string,
): Promise<string> {
  if (targetDescription) {
    return targetDescription;
  }

  const sourceUri = resolveObjectUriFromType(sourceType, sourceName);
  if (!sourceUri) {
    return `Copy of ${sourceName}`;
  }

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

    return desc ? `Copy of ${String(desc)}` : `Copy of ${sourceName}`;
  } catch {
    return `Copy of ${sourceName}`;
  }
}

async function copySourceToClone(
  client: ReturnType<ToolContext['getClient']>,
  resolvedTargetUri: string,
  sourceCode: string,
  targetName: string,
  sourceType: SourceBackedObjectType,
  transport?: string,
): Promise<void> {
  const lockService = createLockService(client);
  let lockHandle: string | undefined;

  try {
    const lockResult = await lockService.lock(resolvedTargetUri, {
      transport,
      objectName: targetName,
      objectType: sourceType,
    });
    lockHandle = lockResult.handle;

    const putParams = new URLSearchParams({
      lockHandle,
      ...(transport ? { corrNr: transport } : {}),
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
    if (lockHandle) {
      try {
        await lockService.unlock(resolvedTargetUri, { lockHandle });
      } catch {
        // ignore unlock errors in error paths
      }
    }
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

        if (!isSourceBackedObjectType(sourceType)) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Object type '${sourceType}' is not supported for cloning. Supported types: ${SOURCE_BACKED_OBJECT_TYPES.join(', ')}`,
              },
            ],
          };
        }

        const description = await resolveCloneDescription(
          client,
          sourceType,
          sourceName,
          args.targetDescription,
        );

        // 2. Get source code
        const sourceCode = await getSourceCode(client, sourceType, sourceName);

        // 3. Create the target object
        await createAdtObject(client, {
          objectType: sourceType,
          objectName: targetName,
          description,
          packageName: args.targetPackage,
          transport: args.transport,
        });

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

        await copySourceToClone(
          client,
          resolvedTargetUri,
          sourceCode,
          targetName,
          sourceType,
          args.transport,
        );

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
