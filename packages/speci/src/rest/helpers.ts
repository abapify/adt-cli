/**
 * Speci REST - Helper functions for REST endpoints
 */

import type { Schema } from '../core/types';
import type {
  RestEndpointDescriptor,
  RestMetadata,
  ResponseMap,
} from './types';

/**
 * Options for REST endpoint helpers
 */
export interface RestEndpointOptions<
  TBodySchema = unknown,
  TResponses extends ResponseMap = ResponseMap,
> {
  /** Request body schema - can be Inferrable schema or plain type */
  body?: TBodySchema;

  /** Query parameters schema */
  query?: Schema;

  /** Headers schema */
  headers?: Schema;

  /** Response schemas by status code (optional when using shortcut syntax) */
  responses?: TResponses;

  /** Optional REST metadata */
  metadata?: RestMetadata;
}

/**
 * HTTP helper object with optional global responses
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type Http<TGlobalResponses extends ResponseMap = {}> = {
  // GET - with shortcut syntax
  get: {
    <TSuccess = unknown>(
      path: string,
    ): RestEndpointDescriptor<
      'GET',
      string,
      never,
      { 200: TSuccess } & TGlobalResponses
    >;

    <TPath extends string, TResponses extends ResponseMap>(
      path: TPath,
      options: Omit<RestEndpointOptions<never, TResponses>, 'body'>,
    ): RestEndpointDescriptor<
      'GET',
      TPath,
      never,
      TResponses & TGlobalResponses
    >;
  };

  // POST - always use options (no shortcut)
  post: <
    TPath extends string,
    TBody = unknown,
    TResponses extends ResponseMap = ResponseMap,
  >(
    path: TPath,
    options: RestEndpointOptions<TBody, TResponses>,
  ) => RestEndpointDescriptor<
    'POST',
    TPath,
    TBody,
    TResponses & TGlobalResponses
  >;

  // PUT - always use options (no shortcut)
  put: <
    TPath extends string,
    TBody = unknown,
    TResponses extends ResponseMap = ResponseMap,
  >(
    path: TPath,
    options: RestEndpointOptions<TBody, TResponses>,
  ) => RestEndpointDescriptor<
    'PUT',
    TPath,
    TBody,
    TResponses & TGlobalResponses
  >;

  // PATCH - always use options (no shortcut)
  patch: <
    TPath extends string,
    TBody = unknown,
    TResponses extends ResponseMap = ResponseMap,
  >(
    path: TPath,
    options: RestEndpointOptions<TBody, TResponses>,
  ) => RestEndpointDescriptor<
    'PATCH',
    TPath,
    TBody,
    TResponses & TGlobalResponses
  >;

  // DELETE - with shortcut syntax
  delete: {
    (
      path: string,
    ): RestEndpointDescriptor<
      'DELETE',
      string,
      never,
      { 204: undefined } & TGlobalResponses
    >;

    <TPath extends string, TResponses extends ResponseMap>(
      path: TPath,
      options: Omit<RestEndpointOptions<never, TResponses>, 'body'>,
    ): RestEndpointDescriptor<
      'DELETE',
      TPath,
      never,
      TResponses & TGlobalResponses
    >;
  };

  head: <TPath extends string, TResponses extends ResponseMap>(
    path: TPath,
    options: Omit<RestEndpointOptions<never, TResponses>, 'body'>,
  ) => RestEndpointDescriptor<
    'HEAD',
    TPath,
    never,
    TResponses & TGlobalResponses
  >;

  options: <TPath extends string, TResponses extends ResponseMap>(
    path: TPath,
    options: Omit<RestEndpointOptions<never, TResponses>, 'body'>,
  ) => RestEndpointDescriptor<
    'OPTIONS',
    TPath,
    never,
    TResponses & TGlobalResponses
  >;
};

/**
 * Create HTTP helpers for defining REST endpoints
 *
 * @param globalResponses - Optional: Global response map to merge with all endpoint responses
 *
 * @example
 * // Without global responses
 * const http = createHttp();
 * http.get('/users', {
 *   responses: { 200: User[], 404: NotFoundError }
 * })
 *
 * @example
 * // With global error responses
 * const globalErrors = {
 *   400: {} as ApiError,
 *   401: {} as ApiError,
 *   500: {} as ApiError
 * };
 *
 * const api = createHttp(globalErrors);
 * api.get('/users', {
 *   responses: { 200: [] as User[] }
 *   // 400, 401, 500 are automatically added
 * })
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export function createHttp<TGlobalResponses extends ResponseMap = {}>(
  globalResponses?: TGlobalResponses,
): Http<TGlobalResponses> {
  const mergeResponses = (responses: any) => {
    if (!globalResponses) return responses;
    return { ...globalResponses, ...responses };
  };

  return {
    get: (path: string, options?: any) => {
      // Shortcut: api.get<User[]>('/path')
      if (!options) {
        return {
          method: 'GET' as const,
          path,
          responses: mergeResponses({ 200: undefined }),
        };
      }
      // Full: api.get('/path', { responses: {...} })
      return {
        method: 'GET' as const,
        path,
        ...options,
        responses: mergeResponses(options.responses || { 200: undefined }),
      };
    },
    post: (path, options) => {
      const { body, responses, ...rest } = options;
      return {
        method: 'POST' as const,
        path,
        body,
        ...rest,
        responses: mergeResponses(responses),
      };
    },

    put: (path, options) => {
      const { body, responses, ...rest } = options;
      return {
        method: 'PUT' as const,
        path,
        body,
        ...rest,
        responses: mergeResponses(responses),
      };
    },

    patch: (path, options) => {
      const { body, responses, ...rest } = options;
      return {
        method: 'PATCH' as const,
        path,
        body,
        ...rest,
        responses: mergeResponses(responses),
      };
    },
    delete: (path: string, options?: any) => {
      // Shortcut: api.delete('/path')
      if (!options) {
        return {
          method: 'DELETE' as const,
          path,
          responses: mergeResponses({ 204: undefined }),
        };
      }
      // Full: api.delete('/path', { responses: {...} })
      return {
        method: 'DELETE' as const,
        path,
        ...options,
        responses: mergeResponses(options.responses || { 204: undefined }),
      };
    },
    head: (path: string, options: any) => ({
      method: 'HEAD' as const,
      path,
      ...options,
      responses: mergeResponses(options.responses),
    }),
    options: (path: string, options: any) => ({
      method: 'OPTIONS' as const,
      path,
      ...options,
      responses: mergeResponses(options.responses),
    }),
  } as Http<TGlobalResponses>;
}

/**
 * Default HTTP helper object
 *
 * @example
 * import { http } from 'speci/rest'
 *
 * http.get('/users', {
 *   responses: { 200: User[], 404: NotFoundError }
 * })
 *
 * http.delete('/users/123', {
 *   responses: { 204: undefined, 404: NotFoundError }
 * })
 */
export const http = createHttp();
