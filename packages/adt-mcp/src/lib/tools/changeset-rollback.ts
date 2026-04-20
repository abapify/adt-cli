/**
 * Tool: changeset_rollback — release every lock held by the current
 * changeset and mark it rolled back.
 *
 * Does NOT revert the source PUTs (see service docs). On success the
 * session's `changeset` pointer is cleared.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ChangesetService } from '@abapify/adt-cli';
import type { ToolContext } from '../types';
import { optionalConnectionShape } from './shared-schemas';
import { requireOpenChangeset, textError, textOk } from './changeset-helpers';

export function registerChangesetRollbackTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'changeset_rollback',
    'Release every lock held by the current changeset and mark it rolled back. ' +
      'Source PUTs are not reverted (SAP has no transactional discard — ' +
      'the inactive version stays until the next edit/activate cycle).',
    {
      ...optionalConnectionShape,
      systemId: z.string().optional(),
    },
    async (_args, extra) => {
      const guard = requireOpenChangeset(ctx, extra, 'changeset_rollback');
      if (!guard.ok) return guard.error;
      const { session, cs } = guard.value;

      try {
        const result = await new ChangesetService(session.client).rollback(cs);
        for (const uri of result.released) session.locks.delete(uri);
        const payload = {
          id: cs.id,
          status: cs.status,
          released: result.released,
          failed: result.failed,
        };
        session.changeset = undefined;
        return textOk({ ok: true, changeset: payload });
      } catch (err) {
        // Best-effort: clear pointer + tracked locks so the session is
        // not wedged in 'open' if rollback itself throws. The next
        // changeset_begin can proceed without force=true.
        for (const entry of cs.entries) session.locks.delete(entry.objectUri);
        session.changeset = undefined;
        return textError(
          `changeset_rollback failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  );
}
