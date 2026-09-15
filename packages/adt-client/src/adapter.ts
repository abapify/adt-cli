/**
 * ADT HTTP Adapter with Basic Authentication
 *
 * Implements the Speci HttpAdapter interface for ADT communication.
 * Automatically handles XML parsing/building using Serializable schemas from adt-schemas.
 */

import type { AdtConnectionConfig } from './types';
import type { HttpAdapter, HttpRequestOptions } from '@abapify/adt-contracts';
import type { ResponsePlugin, ResponseContext } from './plugins/types';
import { SessionManager } from './utils/session';
import { createAdtError } from './errors';
import { activeAdtAbortSignal } from './cancellation';
import { Agent, fetch as undiciFetch, type Dispatcher } from 'undici';

// Re-export HttpAdapter type for consumers
/**
 * Extended ADT connection config with plugins
 */
export interface AdtAdapterConfig extends AdtConnectionConfig {
  /** Response plugins for intercepting and transforming responses */
  plugins?: ResponsePlugin[];
  /**
   * Callback when session expires (SAML redirect detected)
   * Return new cookie header to retry the request, or throw to abort
   */
  onSessionExpired?: () => Promise<string>;
}

/** Options for an authenticated GET that returns plain text. */
export interface BoundedTextRequestOptions {
  url: string;
  headers?: Record<string, string>;
}

/**
 * A response exceeded an explicit byte cap before its body was retained.
 * Deliberately carries size metadata only, never response text.
 */
export class AdtResponseTooLargeError extends Error {
  readonly code = 'ADT_RESPONSE_TOO_LARGE' as const;

  constructor(
    readonly maxBytes: number,
    readonly receivedBytes?: number,
  ) {
    super(`ADT response exceeds the ${maxBytes}-byte limit.`);
    this.name = 'AdtResponseTooLargeError';
  }
}

function contentLengthExceedsLimit(
  contentLength: string | null,
  maxBytes: number,
): number | undefined {
  if (!contentLength || !/^\d+$/.test(contentLength)) return undefined;

  const parsed = Number(contentLength);
  return Number.isSafeInteger(parsed) && parsed > maxBytes ? parsed : undefined;
}

async function abortResponse(
  response: Response,
  abortController: AbortController,
): Promise<void> {
  abortController.abort();
  try {
    await response.body?.cancel();
  } catch {
    // A reader may already own the stream; its cancellation is handled there.
  }
}

async function readResponseTextBounded(
  response: Response,
  maxBytes: number,
  abortController: AbortController,
): Promise<string> {
  const declaredBytes = contentLengthExceedsLimit(
    response.headers.get('content-length'),
    maxBytes,
  );
  if (declaredBytes !== undefined) {
    await abortResponse(response, abortController);
    throw new AdtResponseTooLargeError(maxBytes, declaredBytes);
  }

  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      const nextReceivedBytes = receivedBytes + value.byteLength;
      if (nextReceivedBytes > maxBytes) {
        abortController.abort();
        try {
          await reader.cancel();
        } catch {
          // Abort is already enough to stop the transport if stream cancel fails.
        }
        throw new AdtResponseTooLargeError(maxBytes, nextReceivedBytes);
      }

      chunks.push(value);
      receivedBytes = nextReceivedBytes;
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(combined);
}

function executionAbortController(): {
  abortController: AbortController;
  dispose: () => void;
} {
  const abortController = new AbortController();
  const executionSignal = activeAdtAbortSignal();
  if (!executionSignal) {
    return { abortController, dispose: () => undefined };
  }

  const abortFromExecution = () =>
    abortController.abort(executionSignal.reason);
  if (executionSignal.aborted) {
    abortFromExecution();
  } else {
    executionSignal.addEventListener('abort', abortFromExecution, {
      once: true,
    });
  }
  return {
    abortController,
    dispose: () =>
      executionSignal.removeEventListener('abort', abortFromExecution),
  };
}

/**
 * Create ADT HTTP adapter with Basic or SAML Authentication and plugin support
 */
/** Extended adapter with ETag management */
export interface AdtHttpAdapter extends HttpAdapter {
  /** Clear cached ETag for a specific URL, or all ETags if no URL given */
  clearETag(url?: string): void;
  /** Read an authenticated plain-text response without exceeding maxBytes. */
  readTextBounded(
    options: BoundedTextRequestOptions,
    maxBytes: number,
  ): Promise<string>;
}

export function createAdtAdapter(config: AdtAdapterConfig): AdtHttpAdapter {
  const {
    baseUrl,
    username,
    password,
    cookieHeader,
    authorizationHeader,
    client,
    language,
    logger,
    plugins = [],
    onSessionExpired,
    headersTimeoutMs,
  } = config;

  const dispatcher =
    headersTimeoutMs === undefined
      ? undefined
      : new Agent({ headersTimeout: headersTimeoutMs });

  /** Merge the optional Undici dispatcher into a fetch RequestInit. */
  function withDispatcher<T extends RequestInit>(
    init: T,
  ): T & { dispatcher?: Dispatcher } {
    return dispatcher ? { ...init, dispatcher } : init;
  }

  /** Keep a configured Agent paired with the Undici fetch ABI that created it. */
  async function requestFetch(
    input: string,
    init: RequestInit & { dispatcher?: Dispatcher },
  ): Promise<Response> {
    if (!dispatcher) return globalThis.fetch(input, init);
    return (await undiciFetch(
      input,
      init as Parameters<typeof undiciFetch>[1],
    )) as unknown as Response;
  }

  /**
   * Route a session-manager request through the same paired Undici
   * fetch/dispatcher used for the final adapter request, so the
   * configured headersTimeout applies to the entire write flow
   * (CSRF handshake included), not just the last hop.
   */
  async function sessionFetch(
    input: string | URL,
    init?: RequestInit,
  ): Promise<Response> {
    return requestFetch(input.toString(), withDispatcher(init ?? {}));
  }

  /**
   * Resolve `options.url` against the configured `baseUrl` and reject
   * absolute URLs that would send credentials to a different origin.
   */
  function resolveAdtUrl(requestUrl: string): URL {
    const resolved = new URL(requestUrl, baseUrl);
    const baseOrigin = new URL(baseUrl).origin;
    if (resolved.origin !== baseOrigin) {
      throw new RangeError(
        `Refusing to fetch ${resolved.origin} — ADT requests must target the configured base origin ${baseOrigin}`,
      );
    }
    return resolved;
  }

  // Determine auth method
  const isSamlAuth = !!cookieHeader;

  // Build Authorization header:
  // 1. Explicit authorizationHeader (e.g., "Bearer <token>" for OAuth)
  // 2. Basic Auth header (username/password) when not using SAML
  const basicCredentials = `${username}:${password}`;
  const authHeader =
    authorizationHeader ??
    (isSamlAuth
      ? undefined
      : `Basic ${Buffer.from(basicCredentials).toString('base64')}`);

  // Create session manager for stateful sessions
  const sessionManager = new SessionManager(logger, sessionFetch);

  // Inject SAML cookie if provided
  if (cookieHeader) {
    sessionManager.injectCookie(cookieHeader);
  }

  return {
    async request<TResponse = unknown>(
      options: HttpRequestOptions,
    ): Promise<TResponse> {
      const executionSignal = activeAdtAbortSignal();
      executionSignal?.throwIfAborted();
      logger?.debug('=== ADAPTER REQUEST START ===');
      logger?.debug('options.url:', options.url);
      logger?.debug('options.method:', options.method);
      logger?.debug('options.body:', options.body ? 'present' : 'undefined');
      logger?.debug(
        'options.bodySchema:',
        options.bodySchema ? 'present' : 'undefined',
      );

      // Build full URL (validated against the configured base origin)
      const url = resolveAdtUrl(options.url);

      // Add query parameters
      if (options.query) {
        Object.entries(options.query).forEach(([key, value]) => {
          const values = Array.isArray(value) ? value : [value];
          values.forEach((entry) => {
            if (entry !== undefined) {
              url.searchParams.append(key, String(entry));
            }
          });
        });
      }

      // Add SAP client and language if provided
      if (client) {
        url.searchParams.append('sap-client', client);
      }
      if (language) {
        url.searchParams.append('sap-language', language);
      }

      // For write operations, ensure CSRF token is initialized
      // Uses the 3-step Eclipse ADT security session flow:
      // create session → fetch CSRF → delete session
      const needsCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(
        options.method.toUpperCase(),
      );
      if (needsCsrf && !sessionManager.hasCsrfToken()) {
        logger?.debug(
          'Adapter: Initializing CSRF token before write operation',
        );
        await sessionManager.initializeCsrf(baseUrl, {
          authHeader, // undefined for cookie auth — SessionManager uses stored cookies
          client,
          language,
          signal: executionSignal,
        });
      }

      // Prepare headers (pass URL for ETag lookup on PUT/PATCH)
      const headers: Record<string, string> = {
        'X-sap-adt-sessiontype': sessionManager.getSessionTypeHeader(),
        ...sessionManager.getRequestHeaders(options.method, url.pathname),
        ...options.headers,
      };

      // Add Authorization header only for Basic Auth
      if (authHeader) {
        headers.Authorization = authHeader;
      }

      // Get schemas from speci's standard fields
      // Check if bodySchema is Serializable (has build method from adt-schemas)
      let bodySerializableSchema:
        { build: (data: unknown) => string } | undefined;
      if (options.bodySchema && typeof options.bodySchema === 'object') {
        if (
          'build' in options.bodySchema &&
          typeof options.bodySchema.build === 'function'
        ) {
          bodySerializableSchema = options.bodySchema as {
            build: (data: unknown) => string;
          };
        }
      }

      // Extract response schema from responses object (passed by speci)
      // Schemas from adt-schemas have parse() method (Serializable interface)
      let serializableSchema: { parse: (xml: string) => unknown } | undefined;
      if (options.responses) {
        const schema200 = options.responses[200];
        logger?.debug('Schema detection:', {
          hasSchema: !!schema200,
          type: typeof schema200,
          keys:
            schema200 && typeof schema200 === 'object'
              ? Object.keys(schema200)
              : [],
        });
        if (
          schema200 &&
          typeof schema200 === 'object' &&
          'parse' in schema200 &&
          typeof schema200.parse === 'function'
        ) {
          serializableSchema = schema200 as { parse: (xml: string) => unknown };
        }
      }

      // Build request body using schema if available
      let requestBody: string | undefined;
      const body = options.body;

      logger?.debug('Request URL: ' + options.url);
      logger?.debug('Request method: ' + options.method);
      logger?.debug(
        'options.body: ' +
          (options.body
            ? JSON.stringify(options.body).substring(0, 500)
            : 'UNDEFINED'),
      );
      logger?.debug(
        'options.bodySchema: ' + (options.bodySchema ? 'present' : 'undefined'),
      );
      logger?.debug(
        'bodySerializableSchema: ' +
          (bodySerializableSchema ? 'present' : 'undefined'),
      );
      logger?.debug('Body type: ' + typeof body);
      logger?.debug(
        'Body value: ' +
          (body ? JSON.stringify(body).substring(0, 500) : 'UNDEFINED/NULL'),
      );
      if (body !== undefined && body !== null) {
        if (typeof body === 'string') {
          requestBody = body;
          logger?.debug('Body: using raw string');
          logger?.debug(
            'Body content (first 200 chars):',
            requestBody.substring(0, 200),
          );
        } else if (bodySerializableSchema) {
          // Use Serializable schema's build method (from adt-schemas)
          try {
            logger?.debug(
              'Calling bodySerializableSchema.build with body: ' +
                JSON.stringify(body).substring(0, 300),
            );
            requestBody = bodySerializableSchema.build(body);
            logger?.debug('Body: serialized using Serializable.build()');
            logger?.debug('Body output type: ' + typeof requestBody);
            logger?.debug('Body output length: ' + requestBody?.length);
            logger?.debug(
              'Body content (first 500 chars): ' +
                requestBody?.substring(0, 500),
            );
          } catch (buildError) {
            logger?.error(
              'Schema build() threw error: ' +
                (buildError instanceof Error
                  ? buildError.message
                  : String(buildError)),
            );
            logger?.error(
              'Stack: ' +
                (buildError instanceof Error ? buildError.stack : 'N/A'),
            );
            throw buildError;
          }
        } else {
          requestBody = JSON.stringify(body);
          logger?.debug('Body: serialized as JSON');
        }
      }

      // Make request
      logger?.debug(`HTTP ${options.method} ${url.toString()}`);
      {
        const headerNames = Object.keys(headers).sort();
        logger?.debug(
          'Request headers (names only): ' + JSON.stringify(headerNames),
        );
      }
      const response = await requestFetch(
        url.toString(),
        withDispatcher({
          method: options.method,
          headers,
          body: requestBody,
          signal: executionSignal,
        }),
      );

      // Process response for session management (cookies, CSRF, ETags)
      sessionManager.processResponse(response, url.pathname);
      logger?.debug(`Response: ${response.status} ${response.statusText}`);
      logger?.debug(
        'Response headers: ' +
          JSON.stringify(
            Object.fromEntries(response.headers.entries()),
            null,
            2,
          ),
      );

      // Check for HTTP errors
      if (!response.ok) {
        const errorBody = await response.text();

        // Create structured ADT error with parsed exception details
        const adtError = createAdtError(
          response.status,
          response.statusText,
          url.toString(),
          options.method,
          errorBody,
        );

        // For 412 Precondition Failed, include ETag diagnostic info in error
        if (response.status === 412) {
          const sentETag = headers['If-Match'] ?? '(none)';
          const diag = `[If-Match: ${sentETag}, URL: ${url.pathname}]`;
          logger?.error(
            `ETag mismatch: ${options.method} ${url.pathname} sent If-Match: ${sentETag}`,
          );
          // Append diagnostic to the error message so it surfaces in error handlers
          Object.defineProperty(adtError, 'message', {
            value: `${adtError.message} ${diag}`,
            writable: true,
            configurable: true,
          });
        }

        logger?.error(
          `Request failed - ${adtError.message} (${options.method} ${url.toString()})`,
        );
        if (adtError.exception) {
          logger?.error(
            `ADT Exception: namespace=${adtError.exception.namespace}, type=${adtError.exception.type}`,
          );
        }
        if (errorBody && !adtError.exception) {
          // Log raw body only if we couldn't parse it as ADT exception
          logger?.error(`Response body: ${errorBody}`);
        }

        // On 403, only clear session if it looks like an auth/CSRF issue.
        // Lock conflicts ("currently editing") are NOT session problems —
        // clearing the session would destroy the security session context
        // and break all subsequent lock/unlock operations.
        if (response.status === 403) {
          const isLockConflict =
            adtError.exception?.type === 'ExceptionResourceNoAccess' &&
            (adtError.message.includes('currently editing') ||
              adtError.message.includes('is being edited'));
          if (!isLockConflict) {
            sessionManager.clear();
            logger?.warn('Session cleared due to 403 Forbidden response');
          } else {
            logger?.warn(
              'Lock conflict (403) — session preserved (object locked by another session)',
            );
          }
        }
        throw adtError;
      }

      // Parse response
      const contentType = response.headers.get('content-type') || '';
      const rawText = await response.text();

      // Detect SAML redirect (server returns 200 OK with HTML containing SAMLRequest form)
      // This happens when the session cookie has expired
      if (
        contentType.includes('text/html') &&
        rawText.includes('SAMLRequest')
      ) {
        sessionManager.clear();
        logger?.warn('SAML redirect detected - session expired');

        // If callback provided, try to re-authenticate and retry the request
        if (onSessionExpired) {
          logger?.info('Attempting automatic re-authentication...');
          try {
            const newCookie = await onSessionExpired();
            sessionManager.injectCookie(newCookie);
            logger?.info('Re-authentication successful, retrying request...');
            // Retry the request with new cookie
            return this.request(options);
          } catch (refreshError) {
            logger?.error('Re-authentication failed');
            throw new Error('Session expired - re-authentication failed', {
              cause: refreshError,
            });
          }
        }

        throw new Error('Session expired - SAML re-authentication required');
      }
      let data: any;

      // Check for JSON content (including vendor-specific types like application/vnd.sap.*+json)
      if (
        contentType.includes('application/json') ||
        contentType.includes('+json')
      ) {
        data = JSON.parse(rawText);
      } else if (contentType.includes('text/') || contentType.includes('xml')) {
        // If serializable schema available (has parse method), use it
        if (serializableSchema && contentType.includes('xml')) {
          data = serializableSchema.parse(rawText);
        } else {
          data = rawText;
        }
      } else {
        data = rawText;
      }

      // Apply plugins if any
      if (plugins.length > 0) {
        const context: ResponseContext = {
          rawText,
          parsedData: data,
          url: url.toString(),
          method: options.method,
          contentType,
        };

        // Run plugins in sequence
        for (const plugin of plugins) {
          const result = await plugin.process(context);
          // Plugin can modify the data
          if (result !== undefined) {
            data = result;
            context.parsedData = result;
          }
        }
      }

      // Return just the data (matching Speci's HttpAdapter interface)
      return data as TResponse;
    },

    clearETag(url?: string) {
      sessionManager.clearETag(url);
    },

    async readTextBounded(
      options: BoundedTextRequestOptions,
      maxBytes: number,
    ): Promise<string> {
      if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
        throw new RangeError('maxBytes must be a non-negative safe integer.');
      }

      const url = resolveAdtUrl(options.url);
      if (client) url.searchParams.append('sap-client', client);
      if (language) url.searchParams.append('sap-language', language);

      const headers: Record<string, string> = {
        'X-sap-adt-sessiontype': sessionManager.getSessionTypeHeader(),
        ...sessionManager.getRequestHeaders('GET', url.pathname),
        ...options.headers,
      };
      if (authHeader) headers.Authorization = authHeader;

      const { abortController, dispose } = executionAbortController();
      try {
        const response = await requestFetch(
          url.toString(), // nosemgrep — origin validated by resolveAdtUrl above
          withDispatcher({
            method: 'GET',
            headers,
            signal: abortController.signal,
          }),
        );
        sessionManager.processResponse(response, url.pathname);

        const text = await readResponseTextBounded(
          response,
          maxBytes,
          abortController,
        );

        if (!response.ok) {
          throw createAdtError(
            response.status,
            response.statusText,
            url.toString(),
            'GET',
            text,
          );
        }

        return text;
      } finally {
        dispose();
      }
    },
  };
}
export type { HttpAdapter } from '@abapify/adt-contracts';
