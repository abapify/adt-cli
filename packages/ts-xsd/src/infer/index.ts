/**
 * Type Inference for W3C XSD Schema
 *
 * Infer TypeScript types directly from W3C-compliant Schema objects.
 * No intermediate simplified schema needed - full accuracy preserved.
 *
 * @example
 * ```typescript
 * const schema = {
 *   element: [{ name: 'Person', type: 'PersonType' }],
 *   complexType: [{
 *     name: 'PersonType',
 *     sequence: {
 *       element: [
 *         { name: 'firstName', type: 'xs:string' },
 *         { name: 'age', type: 'xs:int', minOccurs: 0 },
 *       ]
 *     }
 *   }]
 * } as const;
 *
 * type Person = InferSchema<typeof schema>;
 * // { firstName: string; age?: number }
 * ```
 */

// Schema-like types (minimal constraints for `as const` literals)
// Re-exported from xsd/ for convenience
export type * from '../xsd/schema-like';

// Type inference utilities (InferSchema, InferElement, etc.)
export type * from './infer';
