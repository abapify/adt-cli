/**
 * MCP Server factory
 *
 * Creates a configured McpServer instance with all ADT tools registered.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAdtClient, type AdtClient } from '@abapify/adt-client';
import { registerTools } from './tools/index';
import type { ConnectionParams, ToolContext } from './types';
import type { SessionRegistry } from './session/registry.js';

export interface McpServerOptions {
  /** Override the client factory – useful for injecting a mock client in tests. */
  clientFactory?: (params: ConnectionParams) => AdtClient;
  /**
   * Session registry, present only in HTTP mode. When supplied, the
   * ToolContext exposes `registry` and a `getSession` closure so that
   * session-scoped tools (added in a later wave) can look up the active
   * SAP connection for the current MCP session.
   */
  registry?: SessionRegistry;
  /**
   * Multi-system resolver. Maps a logical system id (e.g. `DEV`) to
   * concrete `ConnectionParams`. Present only when the HTTP bin has a
   * multi-system configuration loaded.
   */
  resolveSystem?: (systemId: string) => ConnectionParams | undefined;
}

/**
 * Build an AdtClient from connection parameters using the real HTTP adapter.
 */
function defaultClientFactory(params: ConnectionParams): AdtClient {
  return createAdtClient({
    baseUrl: params.baseUrl,
    username: params.username ?? '',
    password: params.password ?? '',
    client: params.client,
  });
}

export function createMcpServer(options?: McpServerOptions): McpServer {
  const server = new McpServer(
    { name: 'adt-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  const registry = options?.registry;

  const ctx: ToolContext = {
    getClient: options?.clientFactory ?? defaultClientFactory,
    ...(registry
      ? {
          registry,
          getSession: (mcpSessionId: string) => registry.get(mcpSessionId),
        }
      : {}),
    ...(options?.resolveSystem ? { resolveSystem: options.resolveSystem } : {}),
  };

  registerTools(server, ctx);

  return server;
}
