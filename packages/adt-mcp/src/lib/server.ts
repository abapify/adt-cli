/**
 * MCP Server factory
 *
 * Creates a configured McpServer instance with all ADT tools registered.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAdtClient, type AdtClient } from '@abapify/adt-client';
import { registerTools } from './tools/index';
import type { ConnectionParams, ToolContext } from './types';

export interface McpServerOptions {
  /** Override the client factory – useful for injecting a mock client in tests. */
  clientFactory?: (params: ConnectionParams) => AdtClient;
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

  const ctx: ToolContext = {
    getClient: options?.clientFactory ?? defaultClientFactory,
  };

  registerTools(server, ctx);

  return server;
}
