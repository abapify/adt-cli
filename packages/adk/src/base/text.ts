/**
 * Explicit string coercion for untyped values.
 *
 * Values parsed from ADT payloads are `unknown`, and guards like `?? ''` or
 * null checks narrow them to `{}` — a type whose only stringification is
 * Object's default `'[object Object]'`. Naming the built-in keeps that
 * coercion deliberate (`String` semantics exactly, for every input).
 */
export const asText: (value: unknown) => string = String;
