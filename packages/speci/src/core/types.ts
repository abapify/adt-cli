/**
 * Speci v0.1 - Core Types (Protocol-Agnostic)
 *
 * These types work across all protocols: REST, GraphQL, gRPC, WebSocket, etc.
 * Protocol-specific types are in their respective modules.
 */

/**
 * Schema type - can be any type that describes data structure
 * Works with: Zod, JSON Schema, TypeScript types, Protobuf, GraphQL types, etc.
 */
export type Schema<T = any> = T;

/**
 * Generic operation descriptor
 * Protocol-specific descriptors extend this base interface
 */
export interface OperationDescriptor {
  /** Optional metadata */
  metadata?: {
    /** Operation description */
    description?: string;

    /** Tags for grouping */
    tags?: string[];

    /** Deprecation notice */
    deprecated?: boolean;

    /** Any additional metadata */
    [key: string]: any;
  };
}

/**
 * Arrow function that defines an operation contract
 * Generic across all protocols
 */
export type OperationFunction<
  TParams extends any[] = any[],
  TDescriptor extends OperationDescriptor = OperationDescriptor,
> = (...params: TParams) => TDescriptor;

/**
 * Contract - a collection of operation functions
 * Works for REST, GraphQL, gRPC, etc.
 */
export type Contract = {
  [key: string]: OperationFunction | Contract;
};

/**
 * Extract parameter types from an operation function
 */
export type ExtractParams<T> = T extends (...args: infer P) => any ? P : never;

/**
 * Extract descriptor from an operation function
 */
export type ExtractDescriptor<T> = T extends (...args: any[]) => infer D
  ? D
  : never;
