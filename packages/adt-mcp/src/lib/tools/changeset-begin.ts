/**
 * Tool: changeset_begin — open a transactional unit-of-work on the
 * current MCP session.
 *
 * One changeset per session at a time. Callers that already have an open
 * changeset must commit or rollback before starting a new one, unless
 * they pass `force: true` to auto-rollback the previous.
 *
 * Stdio: unsupported — changesets require a stateful session (the
 * changeset is stored on the SapSessionContext).
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ChangesetService } from '@abapify/adt-cli';
import type { ToolContext } from '../types';
import { optionalConnectionShape } from './shared-schemas';

export function registerChangesetBeginTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'changeset_begin',
    'Open a transactional unit-of-work bound to the current MCP session. ' +
      'Pair with changeset_add, changeset_commit, changeset_rollback.',
    {
      ...optionalConnectionShape,
      systemId: z.string().optional(),
      description: z
        .string()
        .optional()
        .describe('Free-text description recorded on the changeset'),
      force: z
        .boolean()
        .optional()
        .describe('Auto-rollback any existing open changeset first'),
    },
    async (args, extra) => {
      const mcpSessionId = extra?.sessionId;
      if (!mcpSessionId || !ctx.registry) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text:
                'changeset_begin requires an HTTP MCP session. Call ' +
                'sap_connect first or switch to the HTTP transport.',
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
              text: 'No SAP session bound to this MCP session. Call sap_connect first.',
            },
          ],
        };
      }

      if (session.changeset && session.changeset.status === 'open') {
        if (!args.force) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text:
                  `A changeset is already open (id=${session.changeset.id}). ` +
                  `Call changeset_commit/rollback, or pass force=true to auto-rollback.`,
              },
            ],
          };
        }
        // Force-rollback prior.
        try {
          const svc = new ChangesetService(session.client);
          await svc.rollback(session.changeset);
        } catch {
          /* best-effort */
        }
      }

      const svc = new ChangesetService(session.client);
      const changeset = svc.begin(args.description);
      session.changeset = changeset;

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                ok: true,
                changeset: {
                  id: changeset.id,
                  status: changeset.status,
                  openedAt: changeset.openedAt,
                  description: changeset.description,
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
