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
      const mcpSessionId = extra?.sessionId;
      if (!mcpSessionId || !ctx.registry) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: 'changeset_add requires an HTTP MCP session (changesets are session-bound).',
            },
          ],
        };
      }
      const session = ctx.registry.get(mcpSessionId);
      if (!session) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: 'No SAP session bound. Call sap_connect first.',
            },
          ],
        };
      }
      if (!session.changeset || session.changeset.status !== 'open') {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: 'No open changeset. Call changeset_begin first.',
            },
          ],
        };
      }

      // Resolve URI via typed lookup, then fall back to repository search.
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
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `changeset_add: object resolution failed: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
          };
        }
      }
      if (!objectUri) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `changeset_add: object '${args.objectName}' (${args.objectType}) not found`,
            },
          ],
        };
      }

      try {
        const svc = new ChangesetService(session.client);
        const entry = await svc.add(session.changeset, {
          objectUri,
          objectType: args.objectType,
          objectName: args.objectName,
          source: args.source,
          transport: args.transport,
        });
        // Track lock at session-level too so other tools can see it.
        session.locks.add(entry.objectUri);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  ok: true,
                  changeset: {
                    id: session.changeset.id,
                    status: session.changeset.status,
                    entryCount: session.changeset.entries.length,
                  },
                  entry: {
                    objectUri: entry.objectUri,
                    objectType: entry.objectType,
                    objectName: entry.objectName,
                    lockHandle: entry.lockHandle,
                    action: entry.action,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `changeset_add failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  );
}
