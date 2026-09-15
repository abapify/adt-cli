/**
 * @abapify/adt-mcp – MCP server for SAP ADT operations
 *
 * Re-exports the server factory so consumers can embed the MCP server
 * programmatically (e.g. in integration tests).
 */

export { createMcpServer, type McpServerOptions } from './lib/server';
export { registerTools } from './lib/tools/index';
/**
 * Canonical typed-first object resolution used by trusted server adapters.
 * The returned ADT URI is adapter-local and must never cross a public boundary.
 */
export { resolveObjectUri } from './lib/tools/utils.js';
export {
  MCP_TOOL_SCOPE_CATALOGUE,
  assertMcpToolIsClassified,
  isMcpToolAllowed,
  operationClassForMcpTool,
  type McpOperationClass,
  type McpRequestAccess,
  type McpDelegatedAccess,
  type McpToolScope,
} from './lib/tools/scope-catalogue.js';
export type { ConnectionParams, ToolContext } from './lib/types';
export type { SapSessionContext } from './lib/session/types';
export {
  createDestinationContextRegistry,
  type DestinationContext,
  type DestinationContextFactory,
  type DestinationContextRegistry,
  type DestinationContextRegistryOptions,
  type DestinationLease,
  type DestinationLeaseProvider,
  type RequestIdentity,
} from './lib/session/destination-registry.js';
export {
  createSessionRegistry,
  type SessionRegistry,
  type SessionRegistryOptions,
} from './lib/session/registry';
export {
  createHttpMcpHandler,
  startHttpServer,
  type HttpMcpHandler,
  type HttpServerOptions,
  type RunningHttpServer,
} from './lib/http/server';
export {
  createMcpInvocationVerifier,
  parseDelegatedAssistantReadPolicy,
  parseScopedAdtInvocationPolicy,
  parseSafeExecutePolicy,
  type DelegatedAssistantReadPolicy,
  type ScopedAdtInvocationPolicy,
  type McpInvocationJsonValue,
  type McpInvocationVerifier,
  type McpInvocationVerifierOptions,
  type McpTrustedOperationClass,
  type SafeExecutePolicy,
  type TrustedMcpInvocationClaims,
} from './lib/http/invocation.js';
export {
  loadMultiSystemConfig,
  type MultiSystemConfig,
  type SystemEntry,
} from './lib/http/multi-system';
