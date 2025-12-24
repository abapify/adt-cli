/**
 * Speci schema helpers
 *
 * Provides utilities to convert ts-xsd TypedSchema to speci-compatible schemas.
 * This is the bridge between ts-xsd and speci libraries.
 */

import type {
  TypedSchema,
  InferTypedSchema,
  SchemaLike,
} from '@abapify/adt-schemas';
import type { Serializable } from 'speci/rest';

// Re-export types for convenience
export type { InferTypedSchema, TypedSchema } from '@abapify/adt-schemas';

/**
 * Speci-compatible schema type that preserves TypedSchema properties
 *
 * Combines:
 * - TypedSchema properties (_type, schema, parse, build)
 * - Serializable properties (_infer for speci type inference)
 */
export type SpeciSchema<T, S extends SchemaLike = SchemaLike> = TypedSchema<
  T,
  S
> &
  Serializable<T>;

/**
 * Convert ts-xsd TypedSchema to speci-compatible Serializable schema
 *
 * Adds the _infer property at runtime for speci's isInferrableSchema check.
 * This enables automatic body parameter type inference in REST contracts.
 *
 * The returned type preserves both TypedSchema and Serializable interfaces,
 * allowing InferTypedSchema to work correctly.
 */
export function toSpeciSchema<S extends TypedSchema<unknown>>(
  tsxsdSchema: S,
): S & Serializable<InferTypedSchema<S>> {
  type T = InferTypedSchema<S>;
  // Add _infer property at runtime - speci checks for this with 'in' operator
  // Return type preserves original schema type S plus Serializable
  return {
    ...tsxsdSchema,
    _infer: undefined as unknown as T,
  } as S & Serializable<T>;
}
