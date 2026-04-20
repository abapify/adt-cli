/**
 * Shared precondition checks for the four changeset_* tools.
 *
 * Keeps the tool files focused on their unique business logic and
 * avoids duplicated "validate MCP session + SAP session + open changeset"
 * blocks across begin/add/commit/rollback.
 */

import type { Changeset } from '../session/changeset';
import type { SapSessionContext } from '../session/types';
import type { ToolContext } from '../types';

export interface TextErrorResult {
  isError: true;
  content: [{ type: 'text'; text: string }];
}

export function textError(text: string): TextErrorResult {
  return { isError: true, content: [{ type: 'text' as const, text }] };
}

export function textOk(payload: unknown): {
  content: [{ type: 'text'; text: string }];
} {
  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(payload, null, 2) },
    ],
  };
}

export type RequireResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: TextErrorResult };

/** Resolve the current HTTP MCP session registry entry, or return a 4xx-style error. */
export function requireSession(
  ctx: ToolContext,
  extra: { sessionId?: string },
  toolName: string,
): RequireResult<SapSessionContext> {
  const mcpSessionId = extra?.sessionId;
  if (!mcpSessionId || !ctx.registry) {
    return {
      ok: false,
      error: textError(`${toolName} requires an HTTP MCP session.`),
    };
  }
  const session = ctx.registry.get(mcpSessionId);
  if (!session) {
    return {
      ok: false,
      error: textError('No SAP session bound. Call sap_connect first.'),
    };
  }
  return { ok: true, value: session };
}

/** Same as requireSession but also asserts there is an open changeset. */
export function requireOpenChangeset(
  ctx: ToolContext,
  extra: { sessionId?: string },
  toolName: string,
): RequireResult<{ session: SapSessionContext; cs: Changeset }> {
  const sess = requireSession(ctx, extra, toolName);
  if (!sess.ok) return sess;
  const cs = sess.value.changeset;
  if (!cs || cs.status !== 'open') {
    return {
      ok: false,
      error: textError(`No open changeset for ${toolName}.`),
    };
  }
  return { ok: true, value: { session: sess.value, cs } };
}
