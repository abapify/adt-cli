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

// Re-export HttpAdapter type for consumers
export type { HttpAdapter };

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

/**
 * Create ADT HTTP adapter with Basic or SAML Authentication and plugin support
 */
export function createAdtAdapter(config: AdtAdapterConfig): HttpAdapter {
  const {
    baseUrl,
    username,
    password,
    cookieHeader,
    client,
    language,
    logger,
    plugins = [],
    onSessionExpired,
  } = config;

  // Determine auth method
  const isSamlAuth = !!cookieHeader;

  // Create Basic Auth header (if not using SAML)
  const authHeader = isSamlAuth
    ? undefined
    : `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

  // Create session manager for stateful sessions
  const sessionManager = new SessionManager(logger);

  // Inject SAML cookie if provided
  if (cookieHeader) {
    sessionManager.injectCookie(cookieHeader);
  }

  return {
    async request<TResponse = unknown>(
      options: HttpRequestOptions,
    ): Promise<TResponse> {
      logger?.debug('=== ADAPTER REQUEST START ===');
      logger?.debug('options.url:', options.url);
      logger?.debug('options.method:', options.method);
      logger?.debug('options.body:', options.body ? 'present' : 'undefined');
      logger?.debug(
        'options.bodySchema:',
        options.bodySchema ? 'present' : 'undefined',
      );

      // Build full URL
      const url = new URL(options.url, baseUrl);

      // Add query parameters
      if (options.query) {
        Object.entries(options.query).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
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
      const needsCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(
        options.method.toUpperCase(),
      );
      if (needsCsrf && !sessionManager.hasCsrfToken()) {
        logger?.debug(
          'Adapter: Initializing CSRF token before write operation',
        );
        const authForCsrf =
          authHeader || (cookieHeader ? undefined : undefined);
        if (authForCsrf) {
          await sessionManager.initializeCsrf(
            baseUrl,
            authForCsrf,
            client,
            language,
          );
        } else if (cookieHeader) {
          // For cookie auth, make a GET request to sessions endpoint to get CSRF
          const sessionsUrl = new URL(
            '/sap/bc/adt/core/http/sessions',
            baseUrl,
          );
          if (client) sessionsUrl.searchParams.append('sap-client', client);
          if (language)
            sessionsUrl.searchParams.append('sap-language', language);

          const csrfHeaders: Record<string, string> = {
            'x-csrf-token': 'Fetch',
            Accept: 'application/vnd.sap.adt.core.http.session.v3+xml',
            'X-sap-adt-sessiontype': 'stateful',
          };
          const cookieHeader2 = sessionManager.getCookieHeader();
          if (cookieHeader2) csrfHeaders.Cookie = cookieHeader2;

          try {
            const csrfResponse = await fetch(sessionsUrl.toString(), {
              method: 'GET',
              headers: csrfHeaders,
            });
            if (csrfResponse.ok) {
              sessionManager.processResponse(csrfResponse);
              logger?.debug(
                'Adapter: CSRF token initialized from sessions endpoint',
              );
            }
          } catch (e) {
            logger?.warn('Adapter: Failed to initialize CSRF token');
          }
        }
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
        | { build: (data: unknown) => string }
        | undefined;
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
      const response = await fetch(url.toString(), {
        method: options.method,
        headers,
        body: requestBody,
      });

      // Process response for session management (cookies, CSRF, ETags)
      sessionManager.processResponse(response, url.pathname);

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

        // On 403, clear session and let caller retry
        if (response.status === 403) {
          sessionManager.clear();
          logger?.warn('Session cleared due to 403 Forbidden response');
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
            throw new Error('Session expired - re-authentication failed');
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
  };
}
