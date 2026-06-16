/**
 * Speci REST - Server Generator
 *
 * Creates server-ready route definitions from REST contracts.
 *
 * This is the server-side counterpart of createClient. It walks a contract
 * tree, extracts endpoint definitions (method, path, body schema, response
 * schemas), and returns structured route definitions that can be used to
 * build HTTP servers with any framework (node:http, Express, Hono, etc.).
 *
 * @example
 * ```typescript
 * import { createServer } from '@abapify/speci/rest';
 * import { adtContract } from '@abapify/adt-contracts';
 *
 * const server = createServer(adtContract);
 *
 * // Use with node:http
 * import { createServer as httpCreate } from 'node:http';
 *
 * httpCreate((req, res) => {
 *   const match = server.match(req.method!, req.url!);
 *   if (match) {
 *     // Forward to downstream SAP, handle JSON↔XML conversion, etc.
 *   }
 * });
 * ```
 */

import type { OperationFunction } from '../../core/types';
import type { RestEndpointDescriptor, Serializable } from '../types';
import type { RouteDefinition, ServerRoutes } from './types';

/** Sentinel value used to mark parameter positions in resolved paths */
const PARAM_MARKER = '\x00';

/**
 * Check if a value is a RestEndpointDescriptor (has method and path)
 */
function isEndpointDescriptor(value: unknown): value is RestEndpointDescriptor {
  return (
    typeof value === 'object' &&
    value !== null &&
    'method' in value &&
    'path' in value &&
    'responses' in value
  );
}

/**
 * Check if a schema is Serializable (has parse method)
 */
function isSerializable(schema: unknown): schema is Serializable {
  return (
    typeof schema === 'object' &&
    schema !== null &&
    typeof (schema as any).parse === 'function'
  );
}

/**
 * Walk a contract tree and extract all endpoint definitions.
 *
 * Calls each operation function with a sentinel value to get the resolved
 * path, then replaces the sentinel with regex capture groups for matching.
 */
function tryExtractEndpoint(
  obj: OperationFunction,
): { operation: OperationFunction; descriptor: RestEndpointDescriptor } | null {
  try {
    const paramCount = obj.length || 1;
    const sentinelArgs = Array.from({ length: paramCount }, () => PARAM_MARKER);
    const descriptor = obj(...sentinelArgs);
    if (isEndpointDescriptor(descriptor)) {
      return { operation: obj, descriptor };
    }
  } catch {
    // Some functions may need different args - skip
  }
  return null;
}

function walkContract(
  obj: any,
  parentPath: string[],
): Array<{ operation: OperationFunction; descriptor: RestEndpointDescriptor }> {
  if (typeof obj === 'function') {
    const result = tryExtractEndpoint(obj as OperationFunction);
    return result ? [result] : [];
  }

  if (typeof obj === 'object' && obj !== null) {
    const endpoints: Array<{
      operation: OperationFunction;
      descriptor: RestEndpointDescriptor;
    }> = [];
    for (const [key, value] of Object.entries(obj)) {
      endpoints.push(...walkContract(value, [...parentPath, key]));
    }
    return endpoints;
  }

  return [];
}

/**
 * Convert a resolved path with sentinel markers into a regex pattern.
 *
 * Also extracts path parameter names from the original function's parameter list.
 *
 * @example
 * // For path '/users/\x00/posts/\x00' with param names ['userId', 'postId']
 * // Returns: /\/users\/([^/]+)\/posts\/([^/]+)/
 */
function buildPathInfo(
  resolvedPath: string,
  paramCount: number,
): { regex: RegExp; template: string; paramNames: string[] } {
  // Count sentinel occurrences to determine parameter count
  const sentinelCount = (
    resolvedPath.match(new RegExp(PARAM_MARKER, 'g')) || []
  ).length;

  // Generate parameter names (p1, p2, ... if we don't know the real names)
  const paramNames = Array.from(
    { length: sentinelCount },
    (_, i) => `p${i + 1}`,
  );

  // Build regex by replacing sentinels with capture groups
  const escaped = resolvedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexStr = escaped.replaceAll(
    new RegExp(PARAM_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
    '([^/]+)',
  );

  // Build template by replacing sentinels with ${paramName} syntax
  let template = resolvedPath;
  for (const name of paramNames) {
    template = template.replace(PARAM_MARKER, `\${${name}}`);
  }

  return {
    regex: new RegExp(`^${regexStr}$`),
    template,
    paramNames,
  };
}

/**
 * Create server-ready route definitions from a REST contract.
 *
 * Walks the contract tree, extracts endpoint definitions, and returns
 * structured route definitions with:
 * - HTTP method and path
 * - Body schema for request conversion (JSON→XML)
 * - Response schemas for response conversion (XML→JSON)
 * - Path parameter extraction
 *
 * @example
 * ```typescript
 * const server = createServer(adtContract);
 *
 * // Match an incoming request
 * const match = server.match('GET', '/sap/bc/adt/cts/transportrequests/DEVK900001');
 * if (match) {
 *   console.log(match.route.method);     // 'GET'
 *   console.log(match.params);           // { p1: 'devk900001' }
 *   console.log(match.route.responseSchemas[200]); // Serializable schema
 * }
 * ```
 */
export function createServer<T extends Record<string, any>>(
  contract: T,
): ServerRoutes {
  const endpoints = walkContract(contract, []);

  const routes: RouteDefinition[] = endpoints.map(
    ({ operation, descriptor }) => {
      const resolvedPath = descriptor.path || '';
      const paramCount = (operation as OperationFunction).length || 0;

      const { regex, template, paramNames } = buildPathInfo(
        resolvedPath,
        paramCount,
      );

      // Extract body schema
      const bodySchema =
        descriptor.body && isSerializable(descriptor.body)
          ? descriptor.body
          : undefined;

      // Extract response schemas (only those that are Serializable)
      const responseSchemas: Record<number, Serializable> = {};
      if (descriptor.responses) {
        for (const [status, schema] of Object.entries(descriptor.responses)) {
          if (isSerializable(schema)) {
            responseSchemas[Number(status)] = schema;
          }
        }
      }

      return {
        method: descriptor.method,
        path: resolvedPath,
        pathTemplate: template,
        pathParamNames: paramNames,
        bodySchema,
        responseSchemas,
        requestHeaders: descriptor.headers as
          | Record<string, string>
          | undefined,
        _regex: regex,
      } as RouteDefinition & { _regex: RegExp };
    },
  );

  return {
    routes,

    match(
      method: string,
      url: string,
      basePath = '',
    ): { route: RouteDefinition; params: Record<string, string> } | null {
      // Strip query string and base path
      const pathname = url.split('?')[0];
      const relativePath = basePath
        ? pathname.replace(
            new RegExp(`^${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
            '',
          ) || '/'
        : pathname;

      for (const route of routes) {
        const routeWithRegex = route as RouteDefinition & { _regex: RegExp };

        // Skip if method doesn't match
        if (route.method !== method.toUpperCase()) continue;

        // Try to match the path
        const match = relativePath.match(routeWithRegex._regex);
        if (match) {
          // Build params object from capture groups
          const params: Record<string, string> = {};
          for (let i = 0; i < route.pathParamNames.length; i++) {
            params[route.pathParamNames[i]] = match[i + 1] || '';
          }
          return { route, params };
        }
      }

      return null;
    },
  };
}
