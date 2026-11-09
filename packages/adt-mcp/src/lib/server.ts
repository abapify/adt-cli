/**
 * MCP Server factory
 *
 * Creates a configured McpServer instance with all ADT tools registered.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAdtClient, type AdtClient } from '@abapify/adt-client';
import { registerTools } from './tools/index';
import { createSourceCapabilityRegistry } from './source-capabilities.js';
import type { ConnectionParams, ToolContext } from './types';
import type { SessionRegistry } from './session/registry.js';
import type {
  DestinationContextRegistry,
  RequestIdentity,
} from './session/destination-registry.js';
import {
  destinationModeServer,
  installDestinationModeToolListProjection,
} from './tools/destination-mode.js';
import type { McpRequestAccess } from './tools/scope-catalogue.js';

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
  /** Enables destination-only schemas and per-destination shared contexts. */
  destinationRegistry?: DestinationContextRegistry;
  /** Derives an audit-safe principal from the authenticated transport. */
  requestIdentity?: (extra: { sessionId?: string }) => RequestIdentity;
  /**
   * Resolves explicit operation classes from trusted transport identity.
   * Only ADT Server destination mode consumes this hook; stdio keeps its
   * existing interactive behaviour.
   */
  requestAccess?: (extra: {
    sessionId?: string;
  }) => McpRequestAccess | undefined;
  /** Deployment-owned atomic authorization hook required by scoped execution. */
  consumeExecutionAuthorization?: NonNullable<
    ToolContext['consumeExecutionAuthorization']
  >;
  /** Deployment-owned terminal outcome hook required by scoped execution. */
  reportExecutionOutcome?: NonNullable<ToolContext['reportExecutionOutcome']>;
  /** Hard-cancellable runtime required for scoped execution. */
  executeWithDeadline?: NonNullable<ToolContext['executeWithDeadline']>;
  /** Private ADT broker resolver for signed frozen-source capabilities. */
  resolveFrozenSource?: ToolContext["resolveFrozenSource"];
  /** Filesystem roots available to workspace-mutating flow tools. */
  workspaceRoots?: readonly string[];
  /** Optional deployment-owned flow configuration. */
  flowConfig?: ToolContext['flowConfig'];
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

  const {
    registry,
    clientFactory,
    resolveSystem,
    destinationRegistry,
    requestIdentity,
    requestAccess,
    consumeExecutionAuthorization,
    reportExecutionOutcome,
    executeWithDeadline,
    resolveFrozenSource,
    workspaceRoots,
    flowConfig,
  } = options ?? {};

  const sourceCapabilities = createSourceCapabilityRegistry();

  const ctx: ToolContext = {
    getClient: clientFactory ?? defaultClientFactory,
    sourceCapabilities,
    ...(workspaceRoots ? { workspaceRoots } : {}),
    ...(flowConfig ? { flowConfig } : {}),
    ...(registry
      ? {
          registry,
          getSession: (mcpSessionId: string) => registry.get(mcpSessionId),
        }
      : {}),
    ...(resolveSystem ? { resolveSystem } : {}),
    ...(destinationRegistry
      ? {
          destinationRegistry,
          requestIdentity,
          requestAccess,
          ...(consumeExecutionAuthorization
            ? { consumeExecutionAuthorization }
            : {}),
          ...(reportExecutionOutcome ? { reportExecutionOutcome } : {}),
          ...(executeWithDeadline ? { executeWithDeadline } : {}),
          ...(resolveFrozenSource ? { resolveFrozenSource } : {}),
        }
      : {}),
  };

  registerTools(
    destinationRegistry
      ? destinationModeServer(server, {
          requestAccess,
          consumeExecutionAuthorization,
          reportExecutionOutcome,
          executeWithDeadline,
        })
      : server,
    ctx,
  );
  if (destinationRegistry) {
    installDestinationModeToolListProjection(server, {
      requestAccess,
      consumeExecutionAuthorization,
      reportExecutionOutcome,
      executeWithDeadline,
    });
  }

  return server;
}
