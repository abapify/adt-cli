/**
 * Tool: sap_connect — establish a SAP ADT session bound to the current
 * MCP session.
 *
 * Only meaningful under the HTTP transport, where every request carries
 * an `Mcp-Session-Id` header (surfaced as `extra.sessionId` on the tool
 * handler). Under stdio, `extra.sessionId` is `undefined` and this tool
 * returns a descriptive error — stdio callers should continue to pass
 * credentials per call.
 *
 * Resolution order (first match wins):
 *   1. Explicit `baseUrl` in args → build client directly.
 *   2. `systemId` + server-level `resolveSystem` (multi-system config).
 *   3. `systemId` alone → delegate to `@abapify/adt-cli`'s
 *      `getAdtClientV2({ sid })`, which loads credentials from the
 *      on-disk auth store (`~/.adt/sessions/<sid>.json`). This path is
 *      intentionally coupled to the filesystem for developer/local use.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AdtClient } from '@abapify/adt-client';
import { getAdtClientV2Safe, AdtAuthError } from '@abapify/adt-cli';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';

interface SapConnectArgs {
  baseUrl?: string;
  client?: string;
  username?: string;
  password?: string;
  systemId?: string;
}

async function resolveAdtClient(
  ctx: ToolContext,
  args: SapConnectArgs,
): Promise<{ client: AdtClient; systemId?: string; source: string }> {
  // Priority A: explicit baseUrl.
  if (args.baseUrl) {
    return {
      client: ctx.getClient({
        baseUrl: args.baseUrl,
        client: args.client,
        username: args.username,
        password: args.password,
      }),
      systemId: args.systemId,
      source: 'explicit',
    };
  }

  // Priority B: systemId via multi-system config.
  if (args.systemId && ctx.resolveSystem) {
    const params = ctx.resolveSystem(args.systemId);
    if (params) {
      return {
        client: ctx.getClient(params),
        systemId: args.systemId,
        source: 'multi-system',
      };
    }
  }

  // Priority C: systemId via adt-cli ~/.adt sessions store.
  if (args.systemId) {
    const client = await getAdtClientV2Safe({ sid: args.systemId });
    return {
      client,
      systemId: args.systemId,
      source: 'adt-cli-auth-store',
    };
  }

  throw new Error(
    'sap_connect requires either an explicit baseUrl (+ credentials) or ' +
      'a systemId resolvable via multi-system config or the ~/.adt session store.',
  );
}

export function registerSapConnectTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'sap_connect',
    'Open a SAP ADT session bound to the current MCP session. ' +
      'Subsequent tool calls on the same MCP session may omit connection args.',
    sessionOrConnectionShape,
    async (args, extra) => {
      const mcpSessionId = extra?.sessionId;

      if (!mcpSessionId) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text:
                'sap_connect requires HTTP transport (Mcp-Session-Id). ' +
                'Stdio callers should pass credentials per tool call instead.',
            },
          ],
        };
      }

      if (!ctx.registry) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: 'server not configured with session registry.',
            },
          ],
        };
      }

      // Idempotent — already connected is a success.
      const existing = ctx.registry.get(mcpSessionId);
      if (existing) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  ok: true,
                  alreadyConnected: true,
                  systemId: existing.systemId,
                  mcpSessionId,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      let resolved: {
        client: AdtClient;
        systemId?: string;
        source: string;
      };
      try {
        resolved = await resolveAdtClient(ctx, args);
      } catch (error) {
        const prefix =
          error instanceof AdtAuthError
            ? `sap_connect auth failure (${error.code})`
            : 'sap_connect failed to resolve a client';
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `${prefix}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }

      // Smoke-test the client before registering — ensures credentials
      // are actually valid. We use discovery (GET, no side effects).
      let serverInfo: unknown;
      try {
        serverInfo = await resolved.client.adt.discovery.getDiscovery();
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `sap_connect verification call failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }

      ctx.registry.create(
        mcpSessionId,
        {
          systemId: resolved.systemId,
          client: resolved.client,
          locks: new Set<string>(),
        },
        async () => {
          // Best-effort cleanup. The v2 AdtClient has no dispose API
          // today; security-session cleanup happens lazily on SAP side.
          // Future wave: release locks tracked in the session context.
        },
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                ok: true,
                mcpSessionId,
                systemId: resolved.systemId,
                source: resolved.source,
                verifiedVia: 'discovery',
                serverInfoPresent: serverInfo !== undefined,
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
