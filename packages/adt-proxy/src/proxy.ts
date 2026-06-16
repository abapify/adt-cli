/**
 * ADT Proxy Server
 *
 * Proxies ADT endpoint requests to a downstream SAP system with
 * automatic JSON↔XML conversion using contract schemas.
 *
 * Architecture:
 *   Client (JSON) → Proxy → Downstream SAP (XML)
 *   Client (JSON) ← Proxy ← Downstream SAP (XML)
 *
 * The proxy uses speci's createServer to extract route definitions
 * from ADT contracts, enabling schema-aware content conversion.
 *
 * @example
 * ```typescript
 * import { createAdtProxy } from '@abapify/adt-proxy';
 *
 * const proxy = createAdtProxy({
 *   targetUrl: 'https://my-sap-system.com:8000',
 *   auth: { username: 'user', password: 'pass', client: '100' },
 * });
 *
 * const { port } = await proxy.start();
 * console.log(`Proxy running on http://localhost:${port}`);
 *
 * // Now send JSON requests to the proxy:
 * // curl -X GET http://localhost:${port}/sap/bc/adt/cts/transportrequests/DEVK900001
 * // The proxy converts the response XML → JSON automatically
 * ```
 */

import { createServer as httpCreateServer, type Server } from 'node:http';
import { createServer } from '@abapify/speci/rest';
import { adtContract, type AdtContract } from '@abapify/adt-contracts';
import type { RouteDefinition } from '@abapify/speci/rest';
import {
  jsonToXml,
  xmlToJson,
  isJsonContentType,
  isXmlContentType,
} from './converter';
import type { AdtProxyConfig, ProxyResult, Logger } from './types';

const DEFAULT_LOGGER: Logger = {
  debug: () => {},
  info: () => {},
  warn: console.warn,
  error: console.error,
};

/**
 * Create an ADT proxy server.
 *
 * @param config - Proxy configuration
 * @returns Proxy server instance with start/stop methods
 */
export function createAdtProxy(config: AdtProxyConfig) {
  const {
    targetUrl,
    auth,
    basePath = '',
    forwardUnknown = true,
    convertContent = true,
    defaultHeaders = {},
    logger = DEFAULT_LOGGER,
  } = config;

  // Extract routes from ADT contracts
  const contractRoutes = createServer(adtContract as AdtContract);
  let server: Server | undefined;

  /**
   * Match an incoming request to a contract route.
   */
  function matchRoute(
    method: string,
    url: string,
  ): { route: RouteDefinition; params: Record<string, string> } | null {
    return contractRoutes.match(method, url, basePath);
  }

  /**
   * Build the downstream URL from the incoming request URL.
   */
  function buildDownstreamUrl(url: string): string {
    const relativePath = basePath
      ? url.replace(new RegExp(`^${basePath}`), '') || '/'
      : url;
    return `${targetUrl}${relativePath}`;
  }

  /**
   * Build Basic Auth header from config.
   */
  function getAuthHeader(): string | undefined {
    if (!auth) return undefined;
    const credentials = Buffer.from(
      `${auth.username}:${auth.password}`,
    ).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Build downstream request headers.
   */
  function buildDownstreamHeaders(
    incomingHeaders: Record<string, string | string[] | undefined>,
    contractHeaders?: Record<string, string>,
    isXmlBody = false,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      ...defaultHeaders,
      ...contractHeaders,
    };

    // Forward relevant headers from the incoming request
    const forwardableHeaders = [
      'accept',
      'content-type',
      'x-csrf-token',
      'x-sap-security-session',
      'x-sap-adt-sessiontype',
      'cookie',
      'authorization',
    ];

    for (const h of forwardableHeaders) {
      const value = incomingHeaders[h];
      if (value && !headers[h]) {
        headers[h] = Array.isArray(value) ? value[0] : value;
      }
    }

    // Add auth if configured and not already present
    if (auth && !headers.authorization) {
      const authHeader = getAuthHeader();
      if (authHeader) headers.authorization = authHeader;
    }

    // Add SAP client if configured
    if (auth?.client && !headers['sap-client']) {
      headers['sap-client'] = auth.client;
    }

    // Set Accept to JSON for the proxy (we want JSON responses)
    if (convertContent && !headers.accept) {
      headers.accept = 'application/json';
    }

    return headers;
  }

  /**
   * Forward a request to the downstream SAP system.
   */
  async function forwardRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: string,
  ): Promise<{
    status: number;
    headers: Record<string, string>;
    body: string;
  }> {
    const response = await fetch(url, {
      method,
      headers,
      body: body || undefined,
    });

    const responseBody = await response.text();
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      headers: responseHeaders,
      body: responseBody,
    };
  }

  /**
   * Handle a single incoming HTTP request.
   */
  async function handleRequest(
    req: {
      method?: string;
      url?: string;
      headers: Record<string, string | string[] | undefined>;
      on: (event: string, cb: (chunk: any) => void) => void;
    },
    res: {
      writeHead: (status: number, headers: Record<string, string>) => void;
      end: (body?: string) => void;
    },
  ): Promise<void> {
    const method = req.method || 'GET';
    const url = req.url || '/';

    logger.info(`${method} ${url}`);

    // Read request body
    let requestBody = '';
    await new Promise<void>((resolve) => {
      req.on('data', (chunk: Buffer) => {
        requestBody += chunk.toString();
      });
      req.on('end', () => resolve());
    });

    // Match to a contract route
    const match = matchRoute(method, url);

    let result: ProxyResult;

    if (match && convertContent) {
      // Route matched - use schema-aware conversion
      const { route, params } = match;
      logger.info(`Matched route: ${route.method} ${route.pathTemplate}`, {
        params,
      });

      // Convert JSON body → XML if needed
      let downstreamBody = requestBody;
      if (requestBody && route.bodySchema) {
        const contentType = Array.isArray(req.headers['content-type'])
          ? req.headers['content-type'][0]
          : req.headers['content-type'];

        if (contentType && isJsonContentType(contentType)) {
          downstreamBody = jsonToXml(requestBody, route.bodySchema);
          logger.debug('Converted request body: JSON → XML');
        }
      }

      // Build downstream headers
      const downstreamHeaders = buildDownstreamHeaders(
        req.headers,
        route.requestHeaders,
        downstreamBody !== requestBody,
      );

      // Set Content-Type for XML body
      if (downstreamBody !== requestBody) {
        downstreamHeaders['content-type'] = 'application/xml';
      }

      // Forward to downstream SAP
      const downstreamUrl = buildDownstreamUrl(url);
      const response = await forwardRequest(
        method,
        downstreamUrl,
        downstreamHeaders,
        downstreamBody,
      );

      // Convert XML response → JSON if needed
      let responseBody = response.body;
      let converted = false;
      if (response.body && route.responseSchemas[200]) {
        const respContentType = response.headers['content-type'] || '';
        if (isXmlContentType(respContentType)) {
          responseBody = xmlToJson(response.body, route.responseSchemas[200]);
          converted = true;
          logger.debug('Converted response body: XML → JSON');
        }
      }

      result = {
        status: response.status,
        headers: response.headers,
        body: responseBody,
        converted,
      };
    } else if (forwardUnknown) {
      // No route match - forward as-is
      if (match === null) {
        logger.debug(`No route match for ${method} ${url} - forwarding as-is`);
      }

      const downstreamHeaders = buildDownstreamHeaders(req.headers);
      const downstreamUrl = buildDownstreamUrl(url);

      const response = await forwardRequest(
        method,
        downstreamUrl,
        downstreamHeaders,
        requestBody,
      );

      result = {
        status: response.status,
        headers: response.headers,
        body: response.body,
        converted: false,
      };
    } else {
      // No route match and forwarding disabled
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'Not Found',
          message: `No contract route matched for ${method} ${url}`,
          availableRoutes: contractRoutes.routes.map((r) => ({
            method: r.method,
            path: r.pathTemplate,
          })),
        }),
      );
      return;
    }

    // Send response
    const responseHeaders: Record<string, string> = {
      'x-proxy': 'adt-proxy',
    };

    // Forward relevant response headers
    const forwardableResponseHeaders = [
      'content-type',
      'x-csrf-token',
      'x-sap-security-session',
      'set-cookie',
      'etag',
      'location',
    ];

    for (const h of forwardableResponseHeaders) {
      if (result.headers[h]) {
        responseHeaders[h] = result.headers[h];
      }
    }

    // Set content type to JSON if we converted
    if (result.converted) {
      responseHeaders['content-type'] = 'application/json';
    }

    res.writeHead(result.status, responseHeaders);
    res.end(result.body);
  }

  return {
    /**
     * Get the extracted route definitions (for inspection/testing).
     */
    get routes() {
      return contractRoutes.routes;
    },

    /**
     * Match a request against the contract routes.
     */
    match: contractRoutes.match,

    /**
     * Start the proxy server.
     *
     * @returns The port the server is listening on
     */
    async start(): Promise<{ port: number }> {
      return new Promise((resolve, reject) => {
        server = httpCreateServer((req, res) => {
          handleRequest(req, res).catch((err) => {
            logger.error('Request handling error', { error: err.message });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                error: 'Internal Server Error',
                message: err.message,
              }),
            );
          });
        });

        server.listen(config.port || 0, config.host || '127.0.0.1', () => {
          const addr = server?.address();
          if (!addr || typeof addr !== 'object') {
            reject(new Error('Failed to get server address'));
            return;
          }
          logger.info(
            `ADT proxy listening on http://${config.host || '127.0.0.1'}:${addr.port}`,
          );
          logger.info(`Proxying to ${targetUrl}`);
          resolve({ port: addr.port });
        });

        server.on('error', reject);
      });
    },

    /**
     * Stop the proxy server.
     */
    async stop(): Promise<void> {
      return new Promise((resolve, reject) => {
        if (!server) return resolve();
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}

// Re-export types and utilities
export { createServer } from '@abapify/speci/rest';
export type { AdtProxyConfig, ProxyResult, Logger } from './types';
export {
  jsonToXml,
  xmlToJson,
  detectContentType,
  isJsonContentType,
  isXmlContentType,
} from './converter';
