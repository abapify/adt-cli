/**
 * Plain-text body schema helper
 *
 * Speci's REST client only forwards request bodies when the declared body is an
 * Inferrable<T> (has an `_infer` marker). Endpoints that send text/plain (e.g.
 * ABAP source code) need a minimal Serializable<string> wrapper so speci routes
 * the body through instead of silently dropping it.
 */

import type { Serializable } from '@abapify/speci/rest';

/**
 * Serializable<string> for text/plain request/response bodies.
 *
 * `parse` coerces the raw response to string; `build` returns the string as-is.
 * The `_infer` marker is the key piece — speci checks for it with `'_infer' in value`
 * to decide whether the descriptor carries a body schema.
 */
export const textPlain = {
  parse: (x: unknown) => String(x),
  build: (x: string) => x,
  _infer: undefined as unknown as string,
} satisfies Serializable<string>;

export type TextPlainSchema = typeof textPlain;
