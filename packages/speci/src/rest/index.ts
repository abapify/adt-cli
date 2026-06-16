/**
 * Speci REST - REST API specification module
 *
 * Provides REST-specific helpers, types, and client generation for HTTP APIs.
 *
 * @example
 * ```typescript
 * import { get, post, put, del } from '@abapify/speci/rest';
 * import { createClient, createFetchAdapter } from '@abapify/speci/rest';
 *
 * // Define contract
 * const api = {
 *   users: {
 *     list: () => get('/users', {
 *       responses: { 200: [] as User[] }
 *     }),
 *
 *     create: (user: CreateUserInput) => post('/users', {
 *       body: user,
 *       responses: { 201: {} as User }
 *     })
 *   }
 * };
 *
 * // Generate client
 * const client = createClient(api, {
 *   baseUrl: 'https://api.example.com',
 *   adapter: createFetchAdapter()
 * });
 * ```
 */

// Export types
export type {
  RestMethod,
  ResponseMap,
  RestEndpointDescriptor,
  RestMetadata,
  RestOperationFunction,
  RestContract,
  ExtractResponse,
  InferSuccessResponse,
  SchemaLike,
  Inferrable,
  Serializable,
  InferSchema,
} from './types';

// Export helpers
export { schema, createInferrable } from './types';

// Export helpers - http object and factory
export { http, createHttp, type RestEndpointOptions } from './helpers';

// Export client
export * from './client';

// Export server
export * from './server';
