/**
 * Schema-Like Types for Type Inference
 *
 * These are minimal type constraints designed to work with `as const` schema literals.
 * They are intentionally looser than the full W3C types in xsd/types.ts to allow
 * TypeScript's compile-time type inference to work correctly.
 *
 * Key differences from xsd/types.ts:
 * - All arrays are `readonly` for `as const` compatibility
 * - Properties are optional and loosely typed
 * - Designed for compile-time inference, not runtime validation
 */

// =============================================================================
// Schema Extensions (non-W3C properties)
// =============================================================================

/**
 * Non-W3C extensions for schema composition and namespace handling.
 * Properties prefixed with $ are clearly non-W3C.
 */
export type SchemaExtensions = {
  /**
   * Namespace prefix declarations (xmlns:prefix -> namespace URI).
   * Extracted from XML namespace attributes, not part of XSD spec.
   * Prefixed with $ to indicate this is NOT a W3C XSD property.
   */
  readonly $xmlns?: { readonly [prefix: string]: string };

  /**
   * Original filename/path of this schema.
   * Used to reconstruct $imports relationships from schemaLocation references.
   * Prefixed with $ to indicate this is NOT a W3C XSD property.
   */
  readonly $filename?: string;

  /**
   * Resolved imported schemas for cross-schema type resolution.
   * Actual schema objects that can be searched for type definitions.
   * Use this to link schemas that import each other (xs:import - different namespace).
   */
  readonly $imports?: readonly SchemaLike[];

  /**
   * Resolved included schemas for same-namespace type resolution.
   * Content from xs:include is in the same namespace as the including schema.
   * Walker traverses both $imports and $includes for type lookups.
   */
  readonly $includes?: readonly SchemaLike[];
};

// =============================================================================
// Schema-like type (W3C properties + extensions)
// =============================================================================

/** Minimal schema shape for inference - W3C Schema properties plus extensions */
export type SchemaLike = SchemaExtensions & {
  // W3C XSD Schema attributes
  readonly targetNamespace?: string;
  readonly elementFormDefault?: string;
  readonly attributeFormDefault?: string;
  readonly version?: string;
  readonly id?: string;
  readonly blockDefault?: string;
  readonly finalDefault?: string;
  readonly 'xml:lang'?: string;

  // W3C XSD Schema children
  readonly element?: readonly ElementLike[];
  readonly complexType?:
    | readonly ComplexTypeLike[]
    | { readonly [name: string]: ComplexTypeLike };
  readonly simpleType?:
    | readonly SimpleTypeLike[]
    | { readonly [name: string]: SimpleTypeLike };
  readonly group?: readonly unknown[];
  readonly attributeGroup?: readonly unknown[];
  readonly notation?: readonly unknown[];
  readonly annotation?: readonly unknown[];
  readonly include?: readonly unknown[];
  readonly import?: readonly unknown[];
  readonly redefine?: readonly RedefineLike[];
  readonly override?: readonly OverrideLike[];
  readonly defaultOpenContent?: unknown;
};

// =============================================================================
// Annotation
// =============================================================================

export type AnnotationLike = {
  readonly documentation?: readonly unknown[];
  readonly appinfo?: readonly unknown[];
};

// =============================================================================
// Element
// =============================================================================

export type ElementLike = {
  readonly name?: string;
  readonly ref?: string;
  readonly type?: string;
  readonly minOccurs?: number | string;
  readonly maxOccurs?: number | string | 'unbounded';
  readonly default?: string;
  readonly fixed?: string;
  readonly id?: string;
  readonly abstract?: boolean;
  readonly nillable?: boolean;
  readonly substitutionGroup?: string;
  readonly complexType?: ComplexTypeLike;
  readonly simpleType?: SimpleTypeLike;
  readonly annotation?: AnnotationLike;
  // Identity constraints
  readonly key?: readonly unknown[];
  readonly keyref?: readonly unknown[];
  readonly unique?: readonly unknown[];
};

// =============================================================================
// Complex Type
// =============================================================================

export type ComplexTypeLike = {
  readonly name?: string;
  readonly id?: string;
  readonly abstract?: boolean;
  readonly mixed?: boolean;
  readonly sequence?: GroupLike;
  readonly choice?: GroupLike;
  readonly all?: GroupLike;
  readonly group?: GroupRefLike;
  readonly attribute?: readonly AttributeLike[];
  readonly attributeGroup?: readonly unknown[];
  readonly anyAttribute?: AnyAttributeLike;
  readonly complexContent?: {
    readonly extension?: ExtensionLike;
    readonly restriction?: ExtensionLike;
  };
  readonly simpleContent?: {
    readonly extension?: SimpleExtensionLike;
    readonly restriction?: unknown;
  };
  readonly annotation?: AnnotationLike;
};

// =============================================================================
// Group (sequence, choice, all)
// =============================================================================

export type GroupLike = {
  readonly minOccurs?: number | string;
  readonly maxOccurs?: number | string | 'unbounded';
  readonly element?: readonly ElementLike[];
  readonly choice?: readonly GroupLike[];
  readonly sequence?: readonly GroupLike[];
  readonly group?: readonly GroupRefLike[];
  readonly any?: readonly unknown[];
  readonly annotation?: AnnotationLike;
};

export type GroupRefLike = {
  readonly ref?: string;
  readonly minOccurs?: number | string;
  readonly maxOccurs?: number | string | 'unbounded';
};

// =============================================================================
// Attribute
// =============================================================================

export type AttributeLike = {
  readonly name?: string;
  readonly ref?: string;
  readonly type?: string;
  readonly use?: 'prohibited' | 'optional' | 'required';
  readonly default?: string;
  readonly fixed?: string;
  readonly id?: string;
  readonly simpleType?: SimpleTypeLike;
  readonly annotation?: AnnotationLike;
};

export type AnyAttributeLike = {
  readonly namespace?: string;
  readonly processContents?: 'strict' | 'lax' | 'skip';
};

// =============================================================================
// Extension (complexContent/simpleContent)
// =============================================================================

export type ExtensionLike = {
  readonly base?: string;
  readonly sequence?: GroupLike;
  readonly choice?: GroupLike;
  readonly all?: GroupLike;
  readonly group?: GroupRefLike;
  readonly attribute?: readonly AttributeLike[];
  readonly attributeGroup?: readonly unknown[];
  readonly anyAttribute?: AnyAttributeLike;
  readonly annotation?: AnnotationLike;
};

export type SimpleExtensionLike = {
  readonly base?: string;
  readonly attribute?: readonly AttributeLike[];
  readonly attributeGroup?: readonly unknown[];
  readonly anyAttribute?: AnyAttributeLike;
};

// =============================================================================
// Simple Type
// =============================================================================

export type SimpleTypeLike = {
  readonly name?: string;
  readonly id?: string;
  readonly annotation?: AnnotationLike;
  readonly restriction?: {
    readonly base?: string;
    readonly enumeration?: readonly { value: string }[];
    readonly pattern?: readonly unknown[];
    readonly minLength?: readonly unknown[];
    readonly maxLength?: readonly unknown[];
    readonly minInclusive?: readonly unknown[];
    readonly maxInclusive?: readonly unknown[];
    readonly minExclusive?: readonly unknown[];
    readonly maxExclusive?: readonly unknown[];
    readonly whiteSpace?: readonly unknown[];
    readonly simpleType?: SimpleTypeLike;
  };
  readonly list?: {
    readonly itemType?: string;
    readonly simpleType?: SimpleTypeLike;
  };
  readonly union?: {
    readonly memberTypes?: string;
    readonly simpleType?: readonly SimpleTypeLike[];
  };
};

// =============================================================================
// Redefine / Override (XSD 1.0 / XSD 1.1)
// =============================================================================

/**
 * xs:redefine - Redefine types from an included schema (XSD 1.0)
 * Types defined here override the original definitions from schemaLocation.
 */
export type RedefineLike = {
  readonly id?: string;
  readonly schemaLocation?: string;
  readonly annotation?: readonly AnnotationLike[];
  readonly simpleType?: readonly SimpleTypeLike[];
  readonly complexType?: readonly ComplexTypeLike[];
  readonly group?: readonly unknown[];
  readonly attributeGroup?: readonly unknown[];
};

/**
 * xs:override - Override types from an included schema (XSD 1.1)
 * More powerful than redefine - can override elements, attributes, notations.
 */
export type OverrideLike = {
  readonly id?: string;
  readonly schemaLocation?: string;
  readonly annotation?: readonly AnnotationLike[];
  readonly simpleType?: readonly SimpleTypeLike[];
  readonly complexType?: readonly ComplexTypeLike[];
  readonly group?: readonly unknown[];
  readonly attributeGroup?: readonly unknown[];
  readonly element?: readonly ElementLike[];
  readonly attribute?: readonly AttributeLike[];
  readonly notation?: readonly unknown[];
};
