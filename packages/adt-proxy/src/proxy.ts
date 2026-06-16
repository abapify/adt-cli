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

const FORWARDABLE_REQUEST_HEADERS = [
  'accept',
  'content-type',
  'x-csrf-token',
  'x-sap-security-session',
  'x-sap-adt-sessiontype',
  'cookie',
  'authorization',
];

const FORWARDABLE_RESPONSE_HEADERS = [
  'content-type',
  'x-csrf-token',
  'x-sap-security-session',
  'set-cookie',
  'etag',
  'location',
];

function forwardHeaders(
  source: Record<string, string | string[] | undefined>,
  target: Record<string, string>,
  keys: string[],
): void {
  for (const h of keys) {
    const value = source[h];
    if (value && !target[h]) {
      target[h] = Array.isArray(value) ? value[0] : value;
    }
  }
}

function addAuthHeaders(
  headers: Record<string, string>,
  auth?: AdtProxyConfig['auth'],
): void {
  if (!auth) return;
  if (!headers.authorization) {
    const creds = Buffer.from(`${auth.username}:${auth.password}`).toString(
      'base64',
    );
    headers.authorization = `Basic ${creds}`;
  }
  if (auth.client && !headers['sap-client']) {
    headers['sap-client'] = auth.client;
  }
}

function convertRequestBody(
  body: string,
  contentType: string | undefined,
  bodySchema?: RouteDefinition['bodySchema'],
): { body: string; converted: boolean } {
  if (!body || !bodySchema || !contentType) {
    return { body, converted: false };
  }
  if (!isJsonContentType(contentType)) {
    return { body, converted: false };
  }
  return { body: jsonToXml(body, bodySchema), converted: true };
}

function convertResponseBody(
  body: string,
  contentType: string,
  responseSchemas: RouteDefinition['responseSchemas'],
): { body: string; converted: boolean } {
  if (!body || !isXmlContentType(contentType) || !responseSchemas[200]) {
    return { body, converted: false };
  }
  return { body: xmlToJson(body, responseSchemas[200]), converted: true };
}

async function forwardRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string,
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
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

  const contractRoutes = createServer(adtContract as AdtContract);
  let server: Server | undefined;

  function buildDownstreamHeaders(
    incomingHeaders: Record<string, string | string[] | undefined>,
    contractHeaders?: Record<string, string>,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      ...defaultHeaders,
      ...contractHeaders,
    };
    forwardHeaders(incomingHeaders, headers, FORWARDABLE_REQUEST_HEADERS);
    addAuthHeaders(headers, auth);
    if (convertContent && !headers.accept) {
      headers.accept = 'application/json';
    }
    return headers;
  }

  function buildDownstreamUrl(url: string): string {
    const relativePath = basePath
      ? url.replace(new RegExp(`^${basePath}`), '') || '/'
      : url;
    return `${targetUrl}${relativePath}`;
  }

  function getContentType(
    headers: Record<string, string | string[] | undefined>,
  ): string | undefined {
    const ct = headers['content-type'];
    return Array.isArray(ct) ? ct[0] : ct;
  }

  async function handleMatchedRoute(
    method: string,
    url: string,
    requestBody: string,
    incomingHeaders: Record<string, string | string[] | undefined>,
    route: RouteDefinition,
  ): Promise<ProxyResult> {
    logger.info(`Matched route: ${route.method} ${route.pathTemplate}`);

    const reqContentType = getContentType(incomingHeaders);
    const { body: downstreamBody, converted: reqConverted } =
      convertRequestBody(requestBody, reqContentType, route.bodySchema);

    const downstreamHeaders = buildDownstreamHeaders(
      incomingHeaders,
      route.requestHeaders,
    );
    if (reqConverted) {
      downstreamHeaders['content-type'] = 'application/xml';
    }

    const response = await forwardRequest(
      method,
      buildDownstreamUrl(url),
      downstreamHeaders,
      downstreamBody,
    );

    const respContentType = response.headers['content-type'] || '';
    const { body: responseBody, converted: respConverted } =
      convertResponseBody(
        response.body,
        respContentType,
        route.responseSchemas,
      );

    return {
      status: response.status,
      headers: response.headers,
      body: responseBody,
      converted: respConverted,
    };
  }

  async function handleForwardedRequest(
    method: string,
    url: string,
    requestBody: string,
    incomingHeaders: Record<string, string | string[] | undefined>,
  ): Promise<ProxyResult> {
    logger.debug(`No route match for ${method} ${url} - forwarding as-is`);

    const downstreamHeaders = buildDownstreamHeaders(incomingHeaders);
    const response = await forwardRequest(
      method,
      buildDownstreamUrl(url),
      downstreamHeaders,
      requestBody,
    );

    return {
      status: response.status,
      headers: response.headers,
      body: response.body,
      converted: false,
    };
  }

  function sendNotFound(
    res: {
      writeHead: (status: number, headers: Record<string, string>) => void;
      end: (body?: string) => void;
    },
    method: string,
    url: string,
  ): void {
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
  }

  function sendResponse(
    res: {
      writeHead: (status: number, headers: Record<string, string>) => void;
      end: (body?: string) => void;
    },
    result: ProxyResult,
  ): void {
    const responseHeaders: Record<string, string> = { 'x-proxy': 'adt-proxy' };
    forwardHeaders(
      result.headers,
      responseHeaders,
      FORWARDABLE_RESPONSE_HEADERS,
    );

    if (result.converted) {
      responseHeaders['content-type'] = 'application/json';
    }

    res.writeHead(result.status, responseHeaders);
    res.end(result.body);
  }

  async function readBody(req: {
    on: (event: string, cb: (chunk: any) => void) => void;
  }): Promise<string> {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      req.on('end', () => resolve(body));
    });
  }

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

    const requestBody = await readBody(req);
    const match = contractRoutes.match(method, url, basePath);

    if (match && convertContent) {
      const result = await handleMatchedRoute(
        method,
        url,
        requestBody,
        req.headers,
        match.route,
      );
      sendResponse(res, result);
      return;
    }

    if (forwardUnknown) {
      const result = await handleForwardedRequest(
        method,
        url,
        requestBody,
        req.headers,
      );
      sendResponse(res, result);
      return;
    }

    sendNotFound(res, method, url);
  }

  return {
    get routes() {
      return contractRoutes.routes;
    },
    match: contractRoutes.match,

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

    async stop(): Promise<void> {
      return new Promise((resolve, reject) => {
        if (!server) return resolve();
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}

export { createServer } from '@abapify/speci/rest';
export type { AdtProxyConfig, ProxyResult, Logger } from './types';
export {
  jsonToXml,
  xmlToJson,
  detectContentType,
  isJsonContentType,
  isXmlContentType,
} from './converter';
