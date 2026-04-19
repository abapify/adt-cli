/**
 * @abapify/adt-mcp – MCP server for SAP ADT operations
 *
 * Re-exports the server factory so consumers can embed the MCP server
 * programmatically (e.g. in integration tests).
 */

export { createMcpServer, type McpServerOptions } from './lib/server';
export { registerTools } from './lib/tools/index';
