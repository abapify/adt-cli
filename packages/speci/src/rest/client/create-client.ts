/**
 * Speci v0.1 - Client Generator
 *
 * Creates a typed client from a contract specification.
 */

import type { OperationFunction } from '../../core/types';
import type { RestClient, ClientConfig } from './types';

/**
 * Extract path parameters from a path template
 * Example: "/users/${id}/posts/${postId}" -> ["id", "postId"]
 */
function extractPathParams(path: string): string[] {
  const matches = path.matchAll(/\$\{(\w+)\}/g);
  return Array.from(matches, (m) => m[1]);
}

/**
 * Replace path parameters with actual values
 * Example: "/users/${id}" with {id: "123"} -> "/users/123"
 */
function replacePath(path: string, params: Record<string, any>): string {
  return path.replace(/\$\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    if (value === undefined) {
      throw new Error(`Missing path parameter: ${key}`);
    }
    return encodeURIComponent(String(value));
  });
}

/**
 * Check if a value is an Inferrable schema (has _infer property)
 */
function isInferrableSchema(value: any): boolean {
  return value && typeof value === 'object' && '_infer' in value;
}

/**
 * Create a client method from an operation function
 */
function createMethod(
  config: ClientConfig,
  operationFn: OperationFunction,
): any {
  const method = async (...args: any[]) => {
    // Execute the operation function with the provided args
    // Contract functions receive params (object or individual), we pass them through
    const descriptor: any = operationFn(...args);

    // For REST endpoints, handle path parameters
    const pathParamNames = descriptor.path
      ? extractPathParams(descriptor.path)
      : [];

    // Build path params object
    // If first arg is an object with path param keys, use it; otherwise use positional args
    const pathParams: Record<string, any> = {};
    const firstArg = args[0];

    if (firstArg && typeof firstArg === 'object' && !Array.isArray(firstArg)) {
      // Object-based parameters - extract from first arg
      pathParamNames.forEach((name) => {
        if (firstArg[name] !== undefined) {
          pathParams[name] = firstArg[name];
        }
      });
    } else {
      // Positional parameters - use arg indices
      pathParamNames.forEach((name, index) => {
        if (args[index] !== undefined) {
          pathParams[name] = args[index];
        }
      });
    }

    // Handle body parameter
    // If descriptor.body is an Inferrable schema, body data comes after path params
    let bodyData = descriptor.body;
    let bodySchema = undefined;

    // Use operationFn.length to determine how many path params the function declared
    // This works because template strings consume the params before we see them
    const declaredParamCount = operationFn.length;

    if (isInferrableSchema(descriptor.body)) {
      // Body is a schema - body data comes after all declared parameters
      bodySchema = descriptor.body;
      // Body is at position: number of declared params (path params consumed by template)
      bodyData = args[declaredParamCount];
    }

    // Replace path parameters if path exists
    const url = descriptor.path
      ? config.baseUrl + replacePath(descriptor.path, pathParams)
      : config.baseUrl;

    // Prepare request options (REST-specific, but works generically)
    let requestOptions = {
      method: descriptor.method || 'GET',
      url,
      body: bodyData, // Actual data (not schema)
      bodySchema, // Schema for adapter to use
      query: descriptor.query,
      headers: {
        ...config.headers,
        ...descriptor.headers,
      },
      responses: descriptor.responses, // Pass responses for adapter
    };

    // Apply request interceptor
    if (config.onRequest) {
      requestOptions = await config.onRequest(requestOptions);
    }

    try {
      // Execute request
      let response = await config.adapter.request(requestOptions);

      // Apply response interceptor
      if (config.onResponse) {
        response = await config.onResponse(response);
      }

      return response;
    } catch (error) {
      // Apply error interceptor
      if (config.onError) {
        return await config.onError(error);
      }
      throw error;
    }
  };

  // Add error type property and isError method for type checking
  (method as any).error = undefined;
  (method as any).isError = (error: unknown): error is any => {
    return error instanceof Error && error.name === 'HttpError';
  };

  return method;
}

/**
 * Create a typed REST client from a contract
 */
export function createClient<T extends Record<string, any>>(
  contract: T,
  config: ClientConfig,
): RestClient<T> {
  const client: any = {};

  for (const [key, value] of Object.entries(contract)) {
    if (typeof value === 'function') {
      // It's an operation function
      client[key] = createMethod(config, value as OperationFunction);
    } else if (typeof value === 'object' && value !== null) {
      // It's a nested contract
      client[key] = createClient(value as Record<string, any>, config);
    }
  }

  return client as RestClient<T>;
}
