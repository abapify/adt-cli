/**
 * Shared helpers for session-aware tools.
 *
 * `resolveClient` is the single entry point for tool handlers that want
 * to work seamlessly in both transports:
 *
 *   - HTTP mode: if an MCP session id is present and the registry has a
 *     matching `SapSessionContext` (populated by `sap_connect`), return
 *     the session-scoped client and mark the call as session-scoped.
 *   - Stdio or fallback: build an ephemeral client from the legacy
 *     connection args carried in the tool call.
 *
 * NOTE: existing tools still use `ctx.getClient(args)` directly. They
 * will migrate to this helper in a later wave. This file is introduced
 * now so new tools (`sap_connect`) can adopt the pattern immediately.
 */

import type { AdtClient } from '@abapify/adt-client';
import type { ConnectionParams, ToolContext } from '../types';

export interface LegacyConnectionArgs {
  baseUrl?: string;
  client?: string;
  username?: string;
  password?: string;
  systemId?: string;
}

export interface ResolvedClient {
  client: AdtClient;
  /** MCP session id, when present. */
  mcpSessionId?: string;
  /** True when the client came from the session registry. */
  isSessionScoped: boolean;
  /** Logical SAP system id, when known. */
  systemId?: string;
}

/**
 * Resolve an `AdtClient` for a tool call.
 *
 * Priority:
 *   1. MCP session (HTTP, `Mcp-Session-Id` → registry entry).
 *   2. Explicit `baseUrl` in `args` → `ctx.getClient`.
 *   3. `systemId` + `ctx.resolveSystem` → `ctx.getClient`.
 *
 * Throws when none apply; callers should wrap with the standard
 * `{ isError: true, content: [...] }` response.
 */
export async function resolveClient(
  ctx: ToolContext,
  args: LegacyConnectionArgs,
  extra: { sessionId?: string },
): Promise<ResolvedClient> {
  const mcpSessionId = extra.sessionId;

  // 1. Session-scoped (HTTP, after sap_connect)
  if (mcpSessionId && ctx.registry) {
    const session = ctx.registry.get(mcpSessionId);
    if (session) {
      ctx.registry.touch(mcpSessionId);
      return {
        client: session.client,
        mcpSessionId,
        isSessionScoped: true,
        systemId: session.systemId,
      };
    }
  }

  // 2. Explicit credentials.
  if (args.baseUrl) {
    const params: ConnectionParams = {
      baseUrl: args.baseUrl,
      client: args.client,
      username: args.username,
      password: args.password,
    };
    return {
      client: ctx.getClient(params),
      mcpSessionId,
      isSessionScoped: false,
      systemId: args.systemId,
    };
  }

  // 3. systemId via multi-system config. Registry holds connection
  // metadata only (baseUrl, client); merge in any credentials the
  // caller supplied on this tool call so the request isn't silently
  // unauthenticated.
  if (args.systemId && ctx.resolveSystem) {
    const params = ctx.resolveSystem(args.systemId);
    if (params) {
      return {
        client: ctx.getClient({
          ...params,
          username: args.username,
          password: args.password,
        }),
        mcpSessionId,
        isSessionScoped: false,
        systemId: args.systemId,
      };
    }
  }

  throw new Error(
    'No client available: run sap_connect first, or pass explicit ' +
      'baseUrl/username/password (or a systemId resolvable by the server).',
  );
}
