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
      const mcpSessionId = extra?.sessionId;
      if (!mcpSessionId || !ctx.registry) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: 'changeset_rollback requires an HTTP MCP session.',
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
              text: 'No open changeset to rollback.',
            },
          ],
        };
      }

      try {
        const svc = new ChangesetService(session.client);
        const result = await svc.rollback(cs);
        for (const uri of result.released) session.locks.delete(uri);
        const payload = {
          id: cs.id,
          status: cs.status,
          released: result.released,
          failed: result.failed,
        };
        session.changeset = undefined;
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ ok: true, changeset: payload }, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `changeset_rollback failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  );
}
