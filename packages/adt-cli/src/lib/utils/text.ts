/**
 * Explicit string coercion for untyped values.
 *
 * Values parsed from ADT payloads are `unknown`, and guards like `?? ''` or
 * null checks narrow them to `{}` — a type whose only stringification is
 * Object's default `'[object Object]'`. Funnelling the conversion through one
 * helper keeps that coercion deliberate (and matches `String()` semantics
 * exactly for every input).
 */
export function asText(value: unknown): string {
  return String(value);
}
