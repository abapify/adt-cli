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
      const mcpSessionId = extra?.sessionId;
      if (!mcpSessionId || !ctx.registry) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: 'changeset_commit requires an HTTP MCP session.',
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
      const cs = session.changeset;
      if (!cs || cs.status !== 'open') {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: 'No open changeset to commit.',
            },
          ],
        };
      }

      try {
        const svc = new ChangesetService(session.client);
        const result = await svc.commit(cs);
        // Clear session-level lock tracking for released entries.
        for (const uri of result.activated) session.locks.delete(uri);
        const committed = {
          id: cs.id,
          status: cs.status,
          activated: result.activated,
          failed: result.failed,
          entryCount: cs.entries.length,
        };
        // Clear pointer — caller starts fresh with changeset_begin.
        session.changeset = undefined;
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ ok: true, changeset: committed }, null, 2),
            },
          ],
        };
      } catch (err) {
        // Clear pointer even on activation failure — locks have been
        // best-effort released by the service. The changeset object is
        // intentionally left in `committing` state for debugging.
        for (const entry of cs.entries) session.locks.delete(entry.objectUri);
        session.changeset = undefined;
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `changeset_commit failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  );
}
