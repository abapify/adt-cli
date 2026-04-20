/**
 * Shared types for the MCP server tools.
 */

import type { AdtClient } from '@abapify/adt-client';

/**
 * Connection parameters that every tool receives.
 *
 * - `baseUrl`: Base ADT endpoint of the SAP system.
 * - `client`: Optional SAP client to connect to.
 * - `username`: Optional username for authentication.
 * - `password`: Optional password for authentication.
 */
export interface ConnectionParams {
  baseUrl: string;
  client?: string;
  username?: string;
  password?: string;
}

/**
 * Context passed to each tool handler at runtime.
 */
export interface ToolContext {
  getClient: (params: ConnectionParams) => AdtClient;
}
