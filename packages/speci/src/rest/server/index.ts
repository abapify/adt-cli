/**
 * Speci REST - Server Module
 *
 * Server-side contract-to-route generation.
 * This is the counterpart of the client module - it takes contracts
 * and generates route definitions for HTTP servers.
 *
 * @example
 * ```typescript
 * import { createServer } from '@abapify/speci/rest/server';
 *
 * const server = createServer(myContract);
 *
 * // Match incoming requests
 * const match = server.match('GET', '/api/users/123');
 * if (match) {
 *   // match.route - RouteDefinition with schemas
 *   // match.params - { id: '123' }
 * }
 * ```
 */

export { createServer } from './create-server';
export type {
  RouteDefinition,
  ServerRequest,
  ServerResponse,
  ServerHandler,
  RouteContext,
  ServerConfig,
  ServerRoutes,
} from './types';
