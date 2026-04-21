/**
 * Tool: changeset_add — stage an object write into the current
 * changeset.
 *
 * Acquires a lock via @abapify/adt-locks, PUTs the supplied source to
 * SAP (object becomes inactive), then records the lock handle on the
 * session's changeset. Activation is deferred to changeset_commit.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ChangesetService } from '@abapify/adt-cli';
import type { ToolContext } from '../types';
import { optionalConnectionShape } from './shared-schemas';
import { resolveObjectUri, resolveObjectUriFromType } from './utils';
import { requireOpenChangeset, textError, textOk } from './changeset-helpers';

export function registerChangesetAddTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'changeset_add',
    'Stage an object write into the current open changeset: lock + PUT source. ' +
      'Activation is deferred to changeset_commit.',
    {
      ...optionalConnectionShape,
      systemId: z.string().optional(),
      objectName: z.string().describe('ABAP object name'),
      objectType: z
        .string()
        .describe('Object type (e.g. PROG, CLAS, INTF, FUGR)'),
      source: z.string().describe('New ABAP source code'),
      transport: z
        .string()
        .optional()
        .describe('Transport request (required for transportable objects)'),
    },
    async (args, extra) => {
      const guard = requireOpenChangeset(ctx, extra, 'changeset_add');
      if (!guard.ok) return guard.error;
      const { session, cs } = guard.value;

      let objectUri =
        resolveObjectUriFromType(args.objectType, args.objectName) ?? undefined;
      if (!objectUri) {
        try {
          objectUri = await resolveObjectUri(
            session.client,
            args.objectName,
            args.objectType,
          );
        } catch (err) {
          return textError(
            `changeset_add: object resolution failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
      if (!objectUri) {
        return textError(
          `changeset_add: object '${args.objectName}' (${args.objectType}) not found`,
        );
      }

      try {
        const entry = await new ChangesetService(session.client).add(cs, {
          objectUri,
          objectType: args.objectType,
          objectName: args.objectName,
          source: args.source,
          transport: args.transport,
        });
        session.locks.add(entry.objectUri);

        return textOk({
          ok: true,
          changeset: {
            id: cs.id,
            status: cs.status,
            entryCount: cs.entries.length,
          },
          entry: {
            objectUri: entry.objectUri,
            objectType: entry.objectType,
            objectName: entry.objectName,
            lockHandle: entry.lockHandle,
            action: entry.action,
          },
        });
      } catch (err) {
        return textError(
          `changeset_add failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  );
}
