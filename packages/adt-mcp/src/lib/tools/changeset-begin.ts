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
import { requireSession, textError, textOk } from './changeset-helpers';

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
      const guard = requireSession(ctx, extra, 'changeset_begin');
      if (!guard.ok) return guard.error;
      const session = guard.value;

      if (session.changeset && session.changeset.status === 'open') {
        if (!args.force) {
          return textError(
            `A changeset is already open (id=${session.changeset.id}). ` +
              `Call changeset_commit/rollback, or pass force=true to auto-rollback.`,
          );
        }
        // Force-rollback prior. If rollback fails we MUST NOT proceed —
        // overwriting session.changeset would orphan its lock handles
        // and leak SAP locks until the security session times out.
        try {
          const prior = session.changeset;
          const result = await new ChangesetService(session.client).rollback(
            prior,
          );
          for (const uri of result.released) session.locks.delete(uri);
        } catch (err) {
          return textError(
            `changeset_begin force=true could not roll back the prior ` +
              `changeset (id=${session.changeset.id}): ` +
              `${err instanceof Error ? err.message : String(err)}. ` +
              `Call changeset_rollback explicitly, or wait for the SAP ` +
              `security session to expire.`,
          );
        }
      }

      const changeset = new ChangesetService(session.client).begin(
        args.description,
      );
      session.changeset = changeset;

      return textOk({
        ok: true,
        changeset: {
          id: changeset.id,
          status: changeset.status,
          openedAt: changeset.openedAt,
          description: changeset.description,
        },
      });
    },
  );
}
