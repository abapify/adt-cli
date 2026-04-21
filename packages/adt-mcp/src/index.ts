/**
 * @abapify/adt-mcp – MCP server for SAP ADT operations
 *
 * Re-exports the server factory so consumers can embed the MCP server
 * programmatically (e.g. in integration tests).
 */

export { createMcpServer, type McpServerOptions } from './lib/server';
export { registerTools } from './lib/tools/index';
export type { ConnectionParams, ToolContext } from './lib/types';
export type { SapSessionContext } from './lib/session/types';
export {
  createSessionRegistry,
  type SessionRegistry,
  type SessionRegistryOptions,
} from './lib/session/registry';
export {
  startHttpServer,
  type HttpServerOptions,
  type RunningHttpServer,
} from './lib/http/server';
export {
  loadMultiSystemConfig,
  type MultiSystemConfig,
  type SystemEntry,
} from './lib/http/multi-system';
