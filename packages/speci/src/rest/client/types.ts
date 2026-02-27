/**
 * Speci REST - Client Types
 *
 * REST-specific client interface types.
 */

import type {
  OperationFunction,
  ExtractParams,
  ExtractDescriptor,
} from '../../core/types';
import type {
  RestEndpointDescriptor,
  InferSuccessResponse,
  InferErrorResponse,
} from '../types';

/**
 * HTTP error with typed payload
 */
export class HttpError<TPayload = unknown> extends Error {
  constructor(
    public readonly status: number,
    public readonly payload: TPayload,
    message?: string,
  ) {
    super(message || `HTTP ${status}`);
    this.name = 'HttpError';
  }
}

/**
 * HTTP request options
 */
export interface HttpRequestOptions {
  method: string;
  url: string;
  body?: unknown;
  query?: Record<string, any>;
  headers?: Record<string, string>;
  bodySchema?: unknown; // Schema for serializing body (passed when body is Inferrable)
  responses?: Record<number, unknown>; // Response schemas by status code
}

/**
 * HTTP adapter interface - consumer provides their own implementation
 *
 * @template TDefaultResponse - Default response type for all requests (useful for testing)
 */
export interface HttpAdapter<TDefaultResponse = unknown> {
  /**
   * Execute an HTTP request
   */
  request<TResponse = TDefaultResponse>(
    options?: HttpRequestOptions,
  ): Promise<TResponse>;
}

/**
 * Client configuration
 */
export interface ClientConfig {
  /** Base URL for all requests */
  baseUrl: string;

  /** HTTP adapter implementation */
  adapter: HttpAdapter;

  /** Default headers for all requests */
  headers?: Record<string, string>;

  /** Request interceptor */
  onRequest?: (options: any) => any | Promise<any>;

  /** Response interceptor */
  onResponse?: (response: any) => any | Promise<any>;

  /** Error interceptor */
  onError?: (error: any) => any | Promise<any>;
}

/**
 * Check if body is an Inferrable schema (has _infer property)
 */
type IsInferrableBody<TBody> = TBody extends { _infer?: any } ? true : false;

/**
 * Check if method is PUT or PATCH (update operations that typically send partial data)
 */
type IsUpdateMethod<TMethod> = TMethod extends 'PUT' | 'PATCH' ? true : false;

/**
 * Extract body type from a REST endpoint descriptor
 * Only extracts if the body is an Inferrable schema
 * For PUT/PATCH methods, returns Partial<T> since updates typically send partial data
 */
type ExtractBodyType<TDescriptor> =
  TDescriptor extends RestEndpointDescriptor<
    infer TMethod,
    any,
    infer TBody,
    any
  >
    ? IsInferrableBody<TBody> extends true
      ? TBody extends { _infer?: infer U }
        ? IsUpdateMethod<TMethod> extends true
          ? Partial<U> // PUT/PATCH: allow partial body
          : U // POST: require full body
        : never
      : never
    : never;

/**
 * Build parameter list for a REST client method
 * - If descriptor has a body with Inferrable schema, append the inferred type as a parameter
 * - Otherwise, use the function's declared parameters
 */
type BuildParams<T extends OperationFunction> =
  ExtractDescriptor<T> extends RestEndpointDescriptor
    ? ExtractBodyType<ExtractDescriptor<T>> extends never
      ? ExtractParams<T> // No body - use declared params
      : ExtractParams<T> extends []
        ? [ExtractBodyType<ExtractDescriptor<T>>] // Empty params + body - add body param
        : [...ExtractParams<T>, ExtractBodyType<ExtractDescriptor<T>>] // Has params + body - append body
    : ExtractParams<T>;

/**
 * Convert a REST operation function to a client method
 * Only returns success response types (2xx) - errors are thrown as HttpError
 * Includes typed error property for error response payloads
 *
 * Automatically infers parameter types from body schema if present
 */
export type RestClientMethod<T extends OperationFunction> = {
  (
    ...params: BuildParams<T>
  ): Promise<
    ExtractDescriptor<T> extends RestEndpointDescriptor
      ? InferSuccessResponse<ExtractDescriptor<T>>
      : never
  >;
  /** Typed error response payload - use with HttpError */
  error: ExtractDescriptor<T> extends RestEndpointDescriptor
    ? InferErrorResponse<ExtractDescriptor<T>>
    : never;
  /** Check if error is from this endpoint */
  isError(
    error: unknown,
  ): error is HttpError<
    ExtractDescriptor<T> extends RestEndpointDescriptor
      ? InferErrorResponse<ExtractDescriptor<T>>
      : never
  >;
};

/**
 * Convert a REST contract to a typed client.
 * Uses Record<string, any> instead of Contract to allow concrete types without index signature.
 */
export type RestClient<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends OperationFunction
    ? RestClientMethod<T[K]>
    : T[K] extends Record<string, any>
      ? RestClient<T[K]>
      : never;
};
