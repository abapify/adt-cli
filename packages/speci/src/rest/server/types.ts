/**
 * Speci REST - Server Types
 *
 * Framework-agnostic types for generating servers from REST contracts.
 */

import type { Serializable, RestEndpointDescriptor } from '../types';

/**
 * HTTP server request (abstraction over node:http IncomingMessage, Web Request, etc.)
 */
export interface ServerRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body?: string;
  query: Record<string, string>;
}

/**
 * HTTP server response (abstraction over node:http ServerResponse, Web Response, etc.)
 */
export interface ServerResponse {
  status: number;
  headers: Record<string, string>;
  body?: string;
}

/**
 * Extracted route definition from a contract endpoint.
 *
 * Contains all the information needed to register an HTTP route
 * and perform content negotiation (JSON↔XML conversion).
 */
export interface RouteDefinition {
  /** HTTP method (GET, POST, PUT, DELETE, etc.) */
  method: string;

  /** Resolved path pattern (e.g., '/sap/bc/adt/oo/classes/myclass') */
  path: string;

  /** Original path template before parameter resolution (e.g., '/sap/bc/adt/oo/classes/${name}') */
  pathTemplate: string;

  /** Path parameter names extracted from the template */
  pathParamNames: string[];

  /** Request body schema (for JSON↔XML conversion of request bodies) */
  bodySchema?: Serializable;

  /** Response schemas keyed by HTTP status code */
  responseSchemas: Record<number, Serializable>;

  /** Expected request headers */
  requestHeaders?: Record<string, string>;

  /** Response headers to include */
  responseHeaders?: Record<string, string>;
}

/**
 * Server handler function for a route.
 *
 * Receives the parsed request and route context, returns a response.
 */
export type ServerHandler = (
  request: ServerRequest,
  context: RouteContext,
) => Promise<ServerResponse> | ServerResponse;

/**
 * Context provided to route handlers
 */
export interface RouteContext {
  /** The matched route definition */
  route: RouteDefinition;

  /** Extracted path parameters (e.g., { name: 'myclass' }) */
  params: Record<string, string>;

  /** The original contract operation function */
  operation: (...args: any[]) => RestEndpointDescriptor;
}

/**
 * Configuration for createServer
 */
export interface ServerConfig {
  /**
   * Base URL prefix to strip from incoming requests before matching.
   * For example, if your proxy is mounted at '/api/v1', set this to '/api/v1'.
   * Defaults to '' (match against full path).
   */
  basePath?: string;
}

/**
 * Result of createServer - a list of route definitions
 */
export interface ServerRoutes {
  /** All extracted route definitions */
  routes: RouteDefinition[];

  /**
   * Match an incoming request to a route definition.
   * Returns the matched route and extracted path parameters, or null.
   */
  match(
    method: string,
    url: string,
    basePath?: string,
  ): { route: RouteDefinition; params: Record<string, string> } | null;
}
