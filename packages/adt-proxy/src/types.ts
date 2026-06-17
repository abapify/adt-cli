/**
 * ADT Proxy Server - Types
 */

import type { Serializable } from '@abapify/speci/rest';

/**
 * Configuration for the ADT proxy server
 */
export interface AdtProxyConfig {
  /** Port to listen on (default: 0 = random available port) */
  port?: number;

  /** Host to bind to (default: '127.0.0.1') */
  host?: string;

  /** Base URL of the downstream SAP system (e.g., 'https://sap-system.com:8000') */
  targetUrl: string;

  /** Authentication credentials for the downstream SAP system */
  auth?: {
    username: string;
    password: string;
    /** SAP client number (e.g., '100') */
    client?: string;
  };

  /** Base path prefix to strip from incoming requests (default: '') */
  basePath?: string;

  /** Whether to forward all requests as-is when no schema match is found (default: true) */
  forwardUnknown?: boolean;

  /** Whether to convert JSON↔XML based on schema (default: true) */
  convertContent?: boolean;

  /** Custom headers to add to all downstream requests */
  defaultHeaders?: Record<string, string>;

  /** Maximum allowed request body size in bytes (default: 10MB) */
  maxBodySize?: number;

  /** Logger instance (must implement debug, info, warn, error methods) */
  logger?: Logger;
}

/**
 * Simple logger interface
 */
export interface Logger {
  debug(msg: string, obj?: any): void;
  info(msg: string, obj?: any): void;
  warn(msg: string, obj?: any): void;
  error(msg: string, obj?: any): void;
}

/**
 * Proxy route handler context
 */
export interface ProxyRouteContext {
  /** Matched route path template */
  pathTemplate: string;

  /** Extracted path parameters */
  params: Record<string, string>;

  /** Request body schema (for JSON→XML conversion) */
  bodySchema?: Serializable;

  /** Response schemas (for XML→JSON conversion) */
  responseSchemas: Record<number, Serializable>;

  /** Original contract endpoint headers */
  contractHeaders?: Record<string, string>;
}

/**
 * Result of a proxied request
 */
export interface ProxyResult {
  /** HTTP status code from downstream */
  status: number;

  /** Response headers from downstream */
  headers: Record<string, string | string[]>;

  /** Response body (JSON string if converted, raw string otherwise) */
  body: string;

  /** Whether the response was converted from XML to JSON */
  converted: boolean;
}
