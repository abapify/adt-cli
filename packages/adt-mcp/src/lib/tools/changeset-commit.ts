/**
 * Tool: changeset_commit — batch-activate every staged object and
 * release all locks.
 *
 * On success the session's `changeset` pointer is cleared. On
 * activation failure we still try to release locks (best-effort) and
 * return an error; the caller can start a fresh changeset.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ChangesetService } from '@abapify/adt-cli';
import type { ToolContext } from '../types';
import { optionalConnectionShape } from './shared-schemas';
import { requireOpenChangeset, textError, textOk } from './changeset-helpers';

export function registerChangesetCommitTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'changeset_commit',
    'Activate every object staged in the current changeset (single batch ' +
      'POST to /sap/bc/adt/activation), release all locks, clear the session pointer.',
    {
      ...optionalConnectionShape,
      systemId: z.string().optional(),
    },
    async (_args, extra) => {
      const guard = requireOpenChangeset(ctx, extra, 'changeset_commit');
      if (!guard.ok) return guard.error;
      const { session, cs } = guard.value;

      try {
        const result = await new ChangesetService(session.client).commit(cs);
        for (const uri of result.activated) session.locks.delete(uri);
        const committed = {
          id: cs.id,
          status: cs.status,
          activated: result.activated,
          failed: result.failed,
          entryCount: cs.entries.length,
        };
        session.changeset = undefined;
        return textOk({ ok: true, changeset: committed });
      } catch (err) {
        // Best-effort: drop tracked locks and clear pointer even on failure.
        for (const entry of cs.entries) session.locks.delete(entry.objectUri);
        session.changeset = undefined;
        return textError(
          `changeset_commit failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  );
}
