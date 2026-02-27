/**
 * AbapGit Schema - extends TypedSchema with values type
 *
 * Provides both:
 * - _type: Full AbapGitType (for XML build/parse)
 * - _values: Inner values type (for handler mapping)
 */

import { typedSchema, type TypedSchema, type SchemaLike } from 'ts-xsd';

/**
 * AbapGit schema instance with both full type and values type
 *
 * @typeParam TFull - Full AbapGitType (root XML structure)
 * @typeParam TValues - Inner values type (e.g., DevcType)
 * @typeParam S - Raw schema literal type
 */
export interface AbapGitSchema<
  TFull,
  TValues,
  S extends SchemaLike = SchemaLike,
> extends TypedSchema<TFull, S> {
  /** The inner values type - use with typeof for type extraction */
  readonly _values: TValues;
}

/**
 * Create an AbapGit typed schema wrapper from raw schema
 *
 * @param rawSchema - Raw schema literal (with `as const`)
 * @returns AbapGitSchema with both _type and _values
 *
 * @example
 * ```typescript
 * import _devc from './schemas/devc';
 *
 * const devc = abapGitSchema<DevcAbapGitType, DevcType>(_devc);
 *
 * // Access types:
 * type Full = typeof devc._type;    // DevcAbapGitType
 * type Values = typeof devc._values; // DevcType
 * ```
 */
export function abapGitSchema<
  TFull,
  TValues,
  S extends SchemaLike = SchemaLike,
>(rawSchema: S): AbapGitSchema<TFull, TValues, S> {
  const base = typedSchema<TFull, S>(rawSchema);
  return {
    _type: base._type as TFull,
    _values: null as unknown as TValues,
    schema: base.schema,
    parse: base.parse as (xml: string) => TFull,
    build: base.build as (
      data: TFull,
      options?: Parameters<typeof base.build>[1],
    ) => string,
  };
}

/** Extract the full AbapGit type from an AbapGitSchema */
export type InferAbapGitType<S> =
  S extends AbapGitSchema<infer T, unknown> ? T : unknown;

/** Extract the values type from an AbapGitSchema */
export type InferValuesType<S> =
  S extends AbapGitSchema<unknown, infer V> ? V : unknown;
