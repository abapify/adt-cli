/**
 * Endpoint Configuration API
 *
 * Type-safe configuration for contract generation.
 * Supports simple patterns (string/regex) and advanced config objects.
 *
 * @example
 * ```typescript
 * import { defineEndpoints, defineEndpoint } from '@abapify/adt-codegen';
 *
 * export const endpoints = defineEndpoints([
 *   // Simple: string glob pattern
 *   '/sap/bc/adt/cts/transportrequests/**',
 *
 *   // Simple: regex
 *   /\/sap\/bc\/adt\/oo\/(classes|interfaces)/,
 *
 *   // Advanced: specific methods only
 *   defineEndpoint({
 *     path: '/sap/bc/adt/atc/runs',
 *     methods: ['POST'],
 *   }),
 * ]);
 * ```
 */

/** HTTP methods supported by ADT */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** Simple pattern - string glob or regex */
export type EndpointPattern = string | RegExp;

/**
 * Advanced endpoint configuration
 */
export interface EndpointConfig {
  /**
   * Path pattern - string glob or regex
   * @example '/sap/bc/adt/atc/runs'
   * @example '/sap/bc/adt/atc/**'
   * @example /\/sap\/bc\/adt\/oo\/(classes|interfaces)/
   */
  path: EndpointPattern;

  /**
   * HTTP methods to generate. If not specified, all methods from discovery are used.
   * @example ['GET', 'POST']
   */
  methods?: HttpMethod[];

  /**
   * Override the schema for this endpoint
   * @example 'atcworklist'
   */
  schema?: string;

  /**
   * Override the Accept header for this endpoint.
   * SAP discovery sometimes reports wrong content types.
   * Use this to specify the actual Accept header value.
   */
  accept?: string;

  /**
   * Custom description for the generated contract
   */
  description?: string;

  /**
   * Generate a full CRUD contract using the crud() helper.
   * When true, generates get/post/put/delete methods following the ADT URL template:
   *   {basePath}/{object_name}{?corrNr,lockHandle,version,accessMode,_action}
   *
   * Requires `schema` and `accept` to be specified.
   *
   * @example
   * ```typescript
   * defineEndpoint({
   *   path: '/sap/bc/adt/oo/classes',
   *   schema: 'classes',
   *   accept: 'application/vnd.sap.adt.oo.classes.v4+xml',
   *   crud: true,
   * })
   * ```
   */
  crud?: boolean;
}

/**
 * Endpoint definition - either simple pattern or advanced config
 */
export type EndpointDefinition = EndpointPattern | EndpointConfig;

/**
 * Normalized endpoint config (internal use)
 */
export interface NormalizedEndpointConfig {
  pattern: EndpointPattern;
  methods?: HttpMethod[];
  schema?: string;
  accept?: string;
  description?: string;
  crud?: boolean;
}

/**
 * Define a single endpoint with advanced configuration
 *
 * @example
 * ```typescript
 * defineEndpoint({
 *   path: '/sap/bc/adt/atc/runs',
 *   methods: ['POST'],
 *   description: 'Run ATC checks',
 * })
 * ```
 */
export function defineEndpoint(config: EndpointConfig): EndpointConfig {
  return config;
}

/**
 * Define multiple endpoints with type safety
 *
 * @example
 * ```typescript
 * defineEndpoints([
 *   '/sap/bc/adt/cts/**',
 *   defineEndpoint({ path: '/sap/bc/adt/atc/runs', methods: ['POST'] }),
 * ])
 * ```
 */
export function defineEndpoints(
  endpoints: EndpointDefinition[],
): EndpointDefinition[] {
  return endpoints;
}

/**
 * Check if a definition is an advanced config object
 */
export function isEndpointConfig(
  def: EndpointDefinition,
): def is EndpointConfig {
  return (
    typeof def === 'object' &&
    def !== null &&
    !(def instanceof RegExp) &&
    'path' in def
  );
}

/**
 * Normalize an endpoint definition to internal format
 */
export function normalizeEndpoint(
  def: EndpointDefinition,
): NormalizedEndpointConfig {
  if (isEndpointConfig(def)) {
    return {
      pattern: def.path,
      methods: def.methods,
      schema: def.schema,
      accept: def.accept,
      description: def.description,
      crud: def.crud,
    };
  }
  return { pattern: def };
}

/**
 * Check if a path matches an endpoint pattern
 */
export function matchesPattern(
  path: string,
  pattern: EndpointPattern,
): boolean {
  if (pattern instanceof RegExp) {
    return pattern.test(path);
  }

  // Glob pattern matching
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3);
    return path.startsWith(prefix);
  }

  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2);
    const remaining = path.slice(prefix.length);
    return path.startsWith(prefix) && !remaining.slice(1).includes('/');
  }

  // Exact match or prefix match
  return path === pattern || path.startsWith(pattern + '/');
}

/**
 * Find the endpoint config that matches a path
 * Returns the first matching config, or undefined if no match
 */
export function findMatchingEndpoint(
  path: string,
  endpoints: EndpointDefinition[],
): NormalizedEndpointConfig | undefined {
  for (const def of endpoints) {
    const normalized = normalizeEndpoint(def);
    if (matchesPattern(path, normalized.pattern)) {
      return normalized;
    }
  }
  return undefined;
}

/**
 * Check if a path is enabled by any endpoint definition
 */
export function isPathEnabled(
  path: string,
  endpoints: EndpointDefinition[],
): boolean {
  return findMatchingEndpoint(path, endpoints) !== undefined;
}

/**
 * Check if a specific method is enabled for a path
 */
export function isMethodEnabled(
  path: string,
  method: HttpMethod,
  endpoints: EndpointDefinition[],
): boolean {
  const config = findMatchingEndpoint(path, endpoints);
  if (!config) return false;

  // If no methods specified, all methods are enabled
  if (!config.methods) return true;

  return config.methods.includes(method);
}
