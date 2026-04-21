/**
 * Shared types for the MCP server tools.
 */

import type { AdtClient } from '@abapify/adt-client';
import type { SapSessionContext } from './session/types.js';
import type { SessionRegistry } from './session/registry.js';

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
 *
 * The legacy `getClient` factory remains the primary path for stdio-mode
 * tools that carry connection parameters in every call. HTTP-mode tools
 * additionally get:
 *
 *   - `registry` / `getSession` — to resolve the active `SapSessionContext`
 *     for the current MCP session (populated by future `sap_connect` tool).
 *   - `resolveSystem` — to map a logical system id (from multi-system
 *     config) to concrete connection parameters.
 */
export interface ToolContext {
  getClient: (params: ConnectionParams) => AdtClient;
  getSession?: (mcpSessionId: string) => SapSessionContext | undefined;
  registry?: SessionRegistry;
  resolveSystem?: (systemId: string) => ConnectionParams | undefined;
}
