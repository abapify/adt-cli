/**
 * Mock HTTP Adapter for Contract Testing
 *
 * Creates a mock adapter that returns fixture data based on request path/method.
 * Tests the full speci client flow: request → schema parsing → typed response.
 */

import type { HttpAdapter, HttpRequestOptions } from 'speci/rest';
import type { FixtureHandle } from 'adt-fixtures';

/**
 * Mock response configuration
 */
export interface MockResponse {
  /** HTTP status code */
  status: number;
  /** Response body (XML string or fixture handle) */
  body: string | FixtureHandle;
  /** Response headers */
  headers?: Record<string, string>;
}

/**
 * Mock request matcher
 */
export interface MockMatcher {
  /** HTTP method to match */
  method?: string;
  /** Path pattern (string for exact match, RegExp for pattern) */
  path?: string | RegExp;
  /** Mock response to return */
  response: MockResponse;
}

/**
 * Create a mock HTTP adapter for testing
 *
 * @param matchers - Array of request matchers with mock responses
 * @returns HttpAdapter that returns mocked responses
 *
 * @example
 * ```typescript
 * const adapter = createMockAdapter([
 *   {
 *     method: 'GET',
 *     path: /\/sap\/bc\/adt\/atc\/worklists\/\d+/,
 *     response: {
 *       status: 200,
 *       body: fixtures.atc.worklist,
 *     },
 *   },
 * ]);
 *
 * const client = createClient(worklistsContract, {
 *   baseUrl: 'https://sap.example.com',
 *   adapter,
 * });
 *
 * const result = await client.get('123');
 * // result is fully typed!
 * ```
 */
export function createMockAdapter(matchers: MockMatcher[]): HttpAdapter {
  return {
    async request<TResponse>(options?: HttpRequestOptions): Promise<TResponse> {
      if (!options) {
        throw new Error('Mock adapter: No request options provided');
      }

      const { method = 'GET', url } = options;

      // Find matching mock
      const matcher = matchers.find((m) => {
        if (m.method && m.method !== method) return false;
        if (m.path) {
          if (typeof m.path === 'string') {
            return url.includes(m.path);
          }
          return m.path.test(url);
        }
        return true;
      });

      if (!matcher) {
        throw new Error(`Mock adapter: No matcher found for ${method} ${url}`);
      }

      const { response } = matcher;

      // Load body from fixture if needed
      let body: string;
      if (typeof response.body === 'string') {
        body = response.body;
      } else {
        body = await response.body.load();
      }

      // Parse response using schema from responses map
      const responseSchema = options.responses?.[response.status];
      if (
        responseSchema &&
        typeof responseSchema === 'object' &&
        'parse' in responseSchema
      ) {
        const parsed = (
          responseSchema as { parse: (xml: string) => unknown }
        ).parse(body);
        return parsed as TResponse;
      }

      // Return raw body if no schema
      return body as TResponse;
    },
  };
}

/**
 * Create a simple mock adapter that always returns the same response
 * Useful for single-endpoint tests
 */
export function createSimpleMockAdapter(
  body: string | FixtureHandle,
  status = 200,
): HttpAdapter {
  return createMockAdapter([
    {
      response: { status, body },
    },
  ]);
}
