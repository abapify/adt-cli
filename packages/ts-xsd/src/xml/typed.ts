/**
 * Typed Schema Wrapper
 *
 * Wraps a raw schema literal with typed parse() and build() methods.
 * Enables full type inference from schema definitions.
 *
 * @example
 * ```typescript
 * import { typed } from 'ts-xsd';
 * import type { InferSchema } from 'ts-xsd';
 *
 * const rawSchema = { ... } as const;
 *
 * // Option 1: Infer type from schema
 * const schema = typed(rawSchema);
 * const data = schema.parse(xml);  // InferSchema<typeof rawSchema>
 *
 * // Option 2: Explicit type (e.g., from generated interfaces)
 * import type { PersonType } from './types';
 * const schema = typed<PersonType>(rawSchema);
 * const data = schema.parse(xml);  // PersonType
 * ```
 */

import type { SchemaLike, InferSchema } from '../infer';
import { parse } from './parse';
import { build, type BuildOptions } from './build';

/**
 * Typed schema instance with parse/build methods
 */
export interface TypedSchema<T, S extends SchemaLike = SchemaLike> {
  /** The data type - use with typeof for type extraction */
  readonly _type: T;

  /** The underlying raw schema */
  readonly schema: S;

  /** Parse XML string to typed object */
  parse(xml: string): T;

  /** Build typed object to XML string */
  build(data: T, options?: BuildOptions): string;
}

/** Resolve data type: use explicit T if provided, otherwise infer from schema */
type ResolveDataType<T, S extends SchemaLike> = unknown extends T
  ? InferSchema<S>
  : T;

/** Extract the data type from a TypedSchema */
export type InferTypedSchema<T extends TypedSchema<unknown>> = T['_type'];

/**
 * Create a typed schema wrapper
 *
 * @param schema - Raw schema literal (with `as const`)
 * @returns Typed schema with parse/build methods
 *
 * @example
 * ```typescript
 * // Infer type from schema
 * const personSchema = typedSchema(rawPersonSchema);
 * const person = personSchema.parse(xml);
 *
 * // Or with explicit type
 * const personSchema = typedSchema<PersonType>(rawPersonSchema);
 * ```
 */
export function typedSchema<T = unknown, S extends SchemaLike = SchemaLike>(
  schema: S,
): TypedSchema<ResolveDataType<T, S>, S> {
  type Data = ResolveDataType<T, S>;
  return {
    // Type-only property for type extraction (not used at runtime)
    _type: null as unknown as Data,
    schema,
    parse(xml: string): Data {
      return parse(schema, xml) as Data;
    },
    build(data: Data, options?: BuildOptions): string {
      return build(schema, data, options);
    },
  };
}
