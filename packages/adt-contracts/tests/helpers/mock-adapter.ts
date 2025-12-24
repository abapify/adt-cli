/**
 * Mock HTTP Adapter for Contract Testing
 *
 * Returns XML strings that get parsed by the contract's response schema.
 * This tests the full contract flow: input types → HTTP → XML → parsed output types.
 */

import type { HttpAdapter, HttpRequestOptions } from 'speci/rest';

/**
 * Captured request details for assertions
 */
export interface CapturedRequest {
  method: string;
  url: string;
  path: string;
  body?: unknown;
  bodyXml?: string;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
}

/**
 * Mock response configuration
 */
export interface MockResponse {
  /** Status code to return */
  status?: number;
  /** Raw XML string to return - will be parsed by response schema */
  xml: string;
}

/**
 * Create a mock HTTP adapter that returns XML and uses contract schemas to parse
 */
export function createMockAdapter(mockResponse: MockResponse): {
  adapter: HttpAdapter;
  getLastRequest: () => CapturedRequest | undefined;
} {
  let lastRequest: CapturedRequest | undefined;

  const adapter: HttpAdapter = {
    request: async <TResponse>(
      options?: HttpRequestOptions,
    ): Promise<TResponse> => {
      if (!options) {
        throw new Error('No request options provided');
      }

      // Capture request details
      const url = new URL(options.url);
      lastRequest = {
        method: options.method,
        url: options.url,
        path: url.pathname,
        body: options.body,
        query: options.query,
        headers: options.headers,
      };

      // If body schema provided, serialize body to XML
      if (options.bodySchema && options.body) {
        const schema = options.bodySchema as {
          build?: (data: unknown) => string;
        };
        if (schema.build) {
          lastRequest.bodyXml = schema.build(options.body);
        }
      }

      // Get response schema for the status code
      const status = mockResponse.status ?? 200;
      const responseSchema = options.responses?.[status] as
        | { parse: (xml: string) => TResponse }
        | undefined;

      if (!responseSchema) {
        throw new Error(`No response schema for status ${status}`);
      }

      // Parse XML using the contract's response schema
      return responseSchema.parse(mockResponse.xml);
    },
  };

  return {
    adapter,
    getLastRequest: () => lastRequest,
  };
}
