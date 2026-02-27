/**
 * Speci REST - REST-specific types
 */

import type { OperationDescriptor, Schema } from '../core/types';

/**
 * HTTP methods for REST APIs
 */
export type RestMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS';

/**
 * Inferrable schema interface (explicit _infer property)
 *
 * Schemas that implement this interface will have their types automatically inferred.
 *
 * @example
 * const UserSchema = {
 *   ...yourSchemaDefinition,
 *   _infer: undefined as unknown as User
 * } as const;
 *
 * responses: { 200: UserSchema }  // Type is User
 */
export interface Inferrable<T = unknown> {
  /** Type inference marker - never accessed at runtime */
  _infer?: T;
}

/**
 * Serializable schema interface (parse/build methods + Inferrable)
 *
 * Extends Inferrable so schemas with parse() automatically get _infer marker.
 * This is the preferred pattern for schema libraries like ts-xsd.
 *
 * @example
 * const UserSchema = {
 *   parse: (raw: string): User => JSON.parse(raw),
 *   build: (data: User): string => JSON.stringify(data),
 * };
 *
 * responses: { 200: UserSchema }  // Type is User (inferred via _infer from Inferrable)
 */
export interface Serializable<T = unknown> extends Inferrable<T> {
  /** Parse raw string to typed object */
  parse(raw: string): T;
  /** Build typed object to string */
  build?(data: T): string;
}

/**
 * Create an Inferrable schema with automatic type inference
 * Cleaner than the manual _infer pattern
 */
export function createInferrable<T>(): Inferrable<T> {
  return { _infer: undefined as unknown as T };
}

/**
 * Infer type from a schema
 *
 * Uses _infer property from Inferrable<T> (which Serializable extends).
 * Falls back to original type if no _infer property.
 *
 * @example
 * type A = InferSchema<{ _infer?: User }>  // User
 * type B = InferSchema<string>             // string (fallback)
 */
export type InferSchema<T> = T extends { _infer?: infer U }
  ? NonNullable<U>
  : T;

/**
 * Schema-like object - can be any schema library (Zod, JSON Schema, custom, etc.)
 * Adapters interpret these based on their capabilities.
 */
export type SchemaLike = unknown;

/**
 * Helper to wrap a schema with type information
 * Use this if your schema doesn't implement Inferrable
 *
 * @example
 * responses: { 200: schema(UserSchema, {} as User) }
 */
export function schema<T>(schemaObject: SchemaLike, _type: T): Inferrable<T> {
  return schemaObject as Inferrable<T>;
}

/**
 * Response map - maps status codes to response types or schemas
 *
 * Values can be:
 * - Type assertions: `undefined as unknown as MyType`
 * - Schema objects: `MyZodSchema`, `MyElementSchema`, etc.
 * - Schema with type: `MySchema as SchemaWithType<MyType>`
 * - The adapter will interpret them appropriately
 */
export type ResponseMap = Record<number, SchemaLike>;

/**
 * REST endpoint descriptor
 * Extends the protocol-agnostic OperationDescriptor with REST-specific fields
 */
export interface RestEndpointDescriptor<
  TMethod extends RestMethod = RestMethod,
  TPath extends string = string,
  TBodySchema = unknown,
  TResponses extends ResponseMap = ResponseMap,
> extends OperationDescriptor {
  /** HTTP method */
  method: TMethod;

  /** URL path with optional template variables */
  path: TPath;

  /** Request body schema - type will be inferred from Inferrable schemas */
  body?: InferSchema<TBodySchema>;

  /** Query parameters schema */
  query?: Schema;

  /** Headers schema */
  headers?: Schema;

  /** Response schemas by HTTP status code */
  responses: TResponses;

  /** REST-specific metadata */
  metadata?: RestMetadata;
}

/**
 * REST-specific metadata
 */
export interface RestMetadata {
  /** Endpoint description */
  description?: string;

  /** Tags for grouping */
  tags?: string[];

  /** Deprecation notice */
  deprecated?: boolean;

  /** Rate limit information */
  rateLimit?: {
    requests: number;
    window: string;
  };

  /** Cache control */
  cache?: {
    maxAge?: number;
    private?: boolean;
  };

  /** Any additional metadata */
  [key: string]: any;
}

/**
 * REST operation function type
 */
export type RestOperationFunction<
  TParams extends any[] = any[],
  TDescriptor extends RestEndpointDescriptor = RestEndpointDescriptor,
> = (...params: TParams) => TDescriptor;

/**
 * REST Contract - enforces that all properties are either:
 * - RestOperationFunction (endpoint)
 * - Nested RestContract (namespace)
 */
export type RestContract = {
  [key: string]: RestOperationFunction | RestContract;
};

/**
 * Extract response type for a specific HTTP status code
 * Automatically infers types from Inferrable schemas
 */
export type ExtractResponse<
  T extends RestEndpointDescriptor,
  Status extends keyof T['responses'],
> = InferSchema<T['responses'][Status]>;

/**
 * Infer the success response type (2xx status codes only)
 * Filters out error responses (4xx, 5xx) and only returns 2xx response types
 * Automatically infers types from Inferrable schemas
 */
export type InferSuccessResponse<T extends RestEndpointDescriptor> = Exclude<
  {
    [K in keyof T['responses']]: K extends
      | 200
      | 201
      | 202
      | 203
      | 204
      | 205
      | 206
      | 207
      | 208
      | 226
      ? InferSchema<T['responses'][K]>
      : never;
  }[keyof T['responses']],
  never | undefined
>;

/**
 * Infer the error response type (non-2xx status codes)
 * Captures all error responses (4xx, 5xx) as a union type
 */
export type InferErrorResponse<T extends RestEndpointDescriptor> = Exclude<
  {
    [K in keyof T['responses']]: K extends
      | 200
      | 201
      | 202
      | 203
      | 204
      | 205
      | 206
      | 207
      | 208
      | 226
      ? never
      : T['responses'][K];
  }[keyof T['responses']],
  never | undefined
>;
