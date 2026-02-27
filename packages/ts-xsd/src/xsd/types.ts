/**
 * XSD Types - TypeScript representation of W3C XML Schema Definition
 *
 * Based on: https://www.w3.org/TR/xmlschema11-1/XMLSchema.xsd
 *
 * These types represent the structure of XSD documents.
 * They are designed to be the result of parsing XMLSchema.xsd itself.
 */

// =============================================================================
// Base Types (from XMLSchema.xsd)
// =============================================================================

// =============================================================================
// XML Namespace Declarations
// =============================================================================

/**
 * XML namespace declarations (xmlns:prefix -> URI mappings)
 *
 * This is not part of XSD itself, but part of XML Namespaces spec.
 * XSD documents rely on xmlns declarations to resolve QName prefixes.
 *
 * @example
 * ```typescript
 * xmlns: {
 *   xs: "http://www.w3.org/2001/XMLSchema",
 *   tns: "http://example.com/myschema",
 *   "": "http://example.com/default"  // default namespace (no prefix)
 * }
 * ```
 */
export type XmlnsDeclarations = {
  readonly [prefix: string]: string;
};

/**
 * xs:openAttrs - base type extended by almost all schema types
 * Allows attributes from other namespaces
 */
export interface OpenAttrs {
  /**
   * XML namespace declarations scoped to this element (xmlns:prefix -> namespace URI).
   * Inherited by child elements unless overridden.
   *
   * Note: Prefixed with $ to indicate this is NOT a W3C XSD property -
   * it's extracted from XML namespace attributes.
   */
  readonly $xmlns?: XmlnsDeclarations;

  /** Any additional attributes from other namespaces */
  [key: string]: unknown;
}

/**
 * Schema-level extensions (non-W3C properties).
 * Properties prefixed with $ are clearly non-W3C.
 */
export interface SchemaAttrs extends OpenAttrs {
  /**
   * Namespace prefix declarations (xmlns:prefix -> namespace URI).
   * Extracted from XML namespace attributes, not part of XSD spec.
   */
  readonly $xmlns?: { readonly [prefix: string]: string };

  /**
   * Original filename/path of this schema.
   * Used to reconstruct $imports relationships from schemaLocation references.
   */
  readonly $filename?: string;

  /**
   * Resolved imported schemas for cross-schema type resolution (xs:import).
   * Actual schema objects that can be searched for type definitions.
   * Use this to link schemas that import each other (different namespace).
   */
  readonly $imports?: readonly Schema[];

  /**
   * Resolved included schemas for same-namespace type resolution (xs:include).
   * Content from xs:include is in the same namespace as the including schema.
   * Walker traverses both $imports and $includes for type lookups.
   */
  readonly $includes?: readonly Schema[];
}

/**
 * xs:annotated - base type for elements that can have annotation
 */
export interface Annotated extends OpenAttrs {
  readonly id?: string;
  readonly annotation?: Annotation;
}

// =============================================================================
// Annotation
// =============================================================================

export interface Annotation extends OpenAttrs {
  readonly id?: string;
  readonly appinfo?: Appinfo[];
  readonly documentation?: Documentation[];
}

export interface Appinfo extends OpenAttrs {
  readonly source?: string;
  readonly _text?: string;
}

export interface Documentation extends OpenAttrs {
  readonly source?: string;
  readonly 'xml:lang'?: string;
  readonly _text?: string;
}

// =============================================================================
// Schema (root element)
// =============================================================================

/**
 * xs:schema - the root element of an XSD document
 */
export interface Schema extends SchemaAttrs {
  readonly id?: string;
  readonly targetNamespace?: string;
  readonly version?: string;
  readonly finalDefault?: string;
  readonly blockDefault?: string;
  readonly attributeFormDefault?: FormChoice;
  readonly elementFormDefault?: FormChoice;
  readonly defaultAttributes?: string;
  readonly xpathDefaultNamespace?: string;
  readonly 'xml:lang'?: string;

  // Composition
  readonly include?: Include[];
  readonly import?: Import[];
  readonly redefine?: Redefine[];
  readonly override?: Override[];
  readonly annotation?: Annotation[];

  // Schema top-level declarations
  // Note: W3C XSD defines these as arrays only. Union types with maps were removed
  // because they caused TypeScript inference issues. Use utility functions for lookups.
  readonly simpleType?: TopLevelSimpleType[];
  readonly complexType?: TopLevelComplexType[];
  readonly group?: NamedGroup[];
  readonly attributeGroup?: NamedAttributeGroup[];
  readonly element?: TopLevelElement[];
  readonly attribute?: TopLevelAttribute[];
  readonly notation?: Notation[];

  // Default open content (XSD 1.1)
  readonly defaultOpenContent?: DefaultOpenContent;
}

export type FormChoice = 'qualified' | 'unqualified';

// =============================================================================
// Include / Import / Redefine / Override
// =============================================================================

export interface Include extends Annotated {
  readonly schemaLocation: string;
}

export interface Import extends Annotated {
  readonly namespace?: string;
  readonly schemaLocation?: string;
}

export interface Redefine extends OpenAttrs {
  readonly id?: string;
  readonly schemaLocation: string;
  readonly annotation?: Annotation[];
  readonly simpleType?: TopLevelSimpleType[];
  readonly complexType?: TopLevelComplexType[];
  readonly group?: NamedGroup[];
  readonly attributeGroup?: NamedAttributeGroup[];
}

export interface Override extends OpenAttrs {
  readonly id?: string;
  readonly schemaLocation: string;
  readonly annotation?: Annotation[];
  readonly simpleType?: TopLevelSimpleType[];
  readonly complexType?: TopLevelComplexType[];
  readonly group?: NamedGroup[];
  readonly attributeGroup?: NamedAttributeGroup[];
  readonly element?: TopLevelElement[];
  readonly attribute?: TopLevelAttribute[];
  readonly notation?: Notation[];
}

// =============================================================================
// Element Declarations
// =============================================================================

/**
 * xs:element (top-level)
 */
export interface TopLevelElement extends Annotated {
  readonly name: string;
  readonly type?: string;
  readonly substitutionGroup?: string;
  readonly default?: string;
  readonly fixed?: string;
  readonly nillable?: boolean;
  readonly abstract?: boolean;
  readonly final?: string;
  readonly block?: string;

  // Inline type definition
  readonly simpleType?: LocalSimpleType;
  readonly complexType?: LocalComplexType;

  // Identity constraints
  readonly unique?: Unique[];
  readonly key?: Key[];
  readonly keyref?: Keyref[];

  // Alternatives (XSD 1.1)
  readonly alternative?: Alternative[];
}

/**
 * xs:element (local, within complexType)
 */
export interface LocalElement extends Annotated {
  readonly name?: string;
  readonly ref?: string;
  readonly type?: string;
  readonly minOccurs?: number | string;
  readonly maxOccurs?: number | string | 'unbounded';
  readonly default?: string;
  readonly fixed?: string;
  readonly nillable?: boolean;
  readonly block?: string;
  readonly form?: FormChoice;
  readonly targetNamespace?: string;

  // Inline type definition
  readonly simpleType?: LocalSimpleType;
  readonly complexType?: LocalComplexType;

  // Identity constraints
  readonly unique?: Unique[];
  readonly key?: Key[];
  readonly keyref?: Keyref[];

  // Alternatives (XSD 1.1)
  readonly alternative?: Alternative[];
}

// =============================================================================
// Attribute Declarations
// =============================================================================

/**
 * xs:attribute (top-level)
 */
export interface TopLevelAttribute extends Annotated {
  readonly name: string;
  readonly type?: string;
  readonly default?: string;
  readonly fixed?: string;
  readonly inheritable?: boolean;

  readonly simpleType?: LocalSimpleType;
}

/**
 * xs:attribute (local, within complexType)
 */
export interface LocalAttribute extends Annotated {
  readonly name?: string;
  readonly ref?: string;
  readonly type?: string;
  readonly use?: 'prohibited' | 'optional' | 'required';
  readonly default?: string;
  readonly fixed?: string;
  readonly form?: FormChoice;
  readonly targetNamespace?: string;
  readonly inheritable?: boolean;

  readonly simpleType?: LocalSimpleType;
}

// =============================================================================
// Complex Types
// =============================================================================

/**
 * xs:complexType (top-level, named)
 */
export interface TopLevelComplexType extends Annotated {
  readonly name: string;
  readonly mixed?: boolean;
  readonly abstract?: boolean;
  readonly final?: string;
  readonly block?: string;
  readonly defaultAttributesApply?: boolean;

  // Content model (choice)
  readonly simpleContent?: SimpleContent;
  readonly complexContent?: ComplexContent;

  // Short form (implicit restriction of anyType)
  readonly openContent?: OpenContent;
  readonly group?: GroupRef;
  readonly all?: All;
  readonly choice?: ExplicitGroup;
  readonly sequence?: ExplicitGroup;
  readonly attribute?: LocalAttribute[];
  readonly attributeGroup?: AttributeGroupRef[];
  readonly anyAttribute?: AnyAttribute;
  readonly assert?: Assertion[];
}

/**
 * xs:complexType (local, inline)
 */
export interface LocalComplexType extends Annotated {
  readonly mixed?: boolean;

  // Content model (choice)
  readonly simpleContent?: SimpleContent;
  readonly complexContent?: ComplexContent;

  // Short form
  readonly openContent?: OpenContent;
  readonly group?: GroupRef;
  readonly all?: All;
  readonly choice?: ExplicitGroup;
  readonly sequence?: ExplicitGroup;
  readonly attribute?: LocalAttribute[];
  readonly attributeGroup?: AttributeGroupRef[];
  readonly anyAttribute?: AnyAttribute;
  readonly assert?: Assertion[];
}

// =============================================================================
// Simple Types
// =============================================================================

/**
 * xs:simpleType (top-level, named)
 */
export interface TopLevelSimpleType extends Annotated {
  readonly name: string;
  readonly final?: string;

  // Derivation (choice)
  readonly restriction?: SimpleTypeRestriction;
  readonly list?: List;
  readonly union?: Union;
}

/**
 * xs:simpleType (local, inline)
 */
export interface LocalSimpleType extends Annotated {
  // Derivation (choice)
  readonly restriction?: SimpleTypeRestriction;
  readonly list?: List;
  readonly union?: Union;
}

export interface SimpleTypeRestriction extends Annotated {
  readonly base?: string;
  readonly simpleType?: LocalSimpleType;

  // Facets
  readonly minExclusive?: Facet[];
  readonly minInclusive?: Facet[];
  readonly maxExclusive?: Facet[];
  readonly maxInclusive?: Facet[];
  readonly totalDigits?: Facet[];
  readonly fractionDigits?: Facet[];
  readonly length?: Facet[];
  readonly minLength?: Facet[];
  readonly maxLength?: Facet[];
  readonly enumeration?: Facet[];
  readonly whiteSpace?: Facet[];
  readonly pattern?: Pattern[];
  readonly assertion?: Assertion[];
  readonly explicitTimezone?: Facet[];
}

export interface List extends Annotated {
  readonly itemType?: string;
  readonly simpleType?: LocalSimpleType;
}

export interface Union extends Annotated {
  readonly memberTypes?: string;
  readonly simpleType?: LocalSimpleType[];
}

export interface Facet extends Annotated {
  readonly value: string;
  readonly fixed?: boolean;
}

export interface Pattern extends Annotated {
  readonly value: string;
}

// =============================================================================
// Complex Content / Simple Content
// =============================================================================

export interface ComplexContent extends Annotated {
  readonly mixed?: boolean;
  readonly restriction?: ComplexContentRestriction;
  readonly extension?: ComplexContentExtension;
}

export interface SimpleContent extends Annotated {
  readonly restriction?: SimpleContentRestriction;
  readonly extension?: SimpleContentExtension;
}

export interface ComplexContentRestriction extends Annotated {
  readonly base: string;
  readonly openContent?: OpenContent;
  readonly group?: GroupRef;
  readonly all?: All;
  readonly choice?: ExplicitGroup;
  readonly sequence?: ExplicitGroup;
  readonly attribute?: LocalAttribute[];
  readonly attributeGroup?: AttributeGroupRef[];
  readonly anyAttribute?: AnyAttribute;
  readonly assert?: Assertion[];
}

export interface ComplexContentExtension extends Annotated {
  readonly base: string;
  readonly openContent?: OpenContent;
  readonly group?: GroupRef;
  readonly all?: All;
  readonly choice?: ExplicitGroup;
  readonly sequence?: ExplicitGroup;
  readonly attribute?: LocalAttribute[];
  readonly attributeGroup?: AttributeGroupRef[];
  readonly anyAttribute?: AnyAttribute;
  readonly assert?: Assertion[];
}

export interface SimpleContentRestriction extends Annotated {
  readonly base: string;
  readonly simpleType?: LocalSimpleType;

  // Facets (same as SimpleTypeRestriction)
  readonly minExclusive?: Facet[];
  readonly minInclusive?: Facet[];
  readonly maxExclusive?: Facet[];
  readonly maxInclusive?: Facet[];
  readonly totalDigits?: Facet[];
  readonly fractionDigits?: Facet[];
  readonly length?: Facet[];
  readonly minLength?: Facet[];
  readonly maxLength?: Facet[];
  readonly enumeration?: Facet[];
  readonly whiteSpace?: Facet[];
  readonly pattern?: Pattern[];
  readonly assertion?: Assertion[];
  readonly explicitTimezone?: Facet[];

  readonly attribute?: LocalAttribute[];
  readonly attributeGroup?: AttributeGroupRef[];
  readonly anyAttribute?: AnyAttribute;
  readonly assert?: Assertion[];
}

export interface SimpleContentExtension extends Annotated {
  readonly base: string;
  readonly attribute?: LocalAttribute[];
  readonly attributeGroup?: AttributeGroupRef[];
  readonly anyAttribute?: AnyAttribute;
  readonly assert?: Assertion[];
}

// =============================================================================
// Model Groups (sequence, choice, all)
// =============================================================================

/**
 * xs:sequence / xs:choice (explicit group)
 */
export interface ExplicitGroup extends Annotated {
  readonly minOccurs?: number | string;
  readonly maxOccurs?: number | string | 'unbounded';

  readonly element?: LocalElement[];
  readonly group?: GroupRef[];
  readonly choice?: ExplicitGroup[];
  readonly sequence?: ExplicitGroup[];
  readonly any?: Any[];
}

/**
 * xs:all
 */
export interface All extends Annotated {
  readonly minOccurs?: number | string;
  readonly maxOccurs?: number | string;

  readonly element?: LocalElement[];
  readonly any?: Any[];
  readonly group?: GroupRef[];
}

// =============================================================================
// Groups and Attribute Groups
// =============================================================================

/**
 * xs:group (named, top-level)
 */
export interface NamedGroup extends Annotated {
  readonly name: string;
  readonly all?: All;
  readonly choice?: ExplicitGroup;
  readonly sequence?: ExplicitGroup;
}

/**
 * xs:group (reference)
 */
export interface GroupRef extends Annotated {
  readonly ref: string;
  readonly minOccurs?: number | string;
  readonly maxOccurs?: number | string | 'unbounded';
}

/**
 * xs:attributeGroup (named, top-level)
 */
export interface NamedAttributeGroup extends Annotated {
  readonly name: string;
  readonly attribute?: LocalAttribute[];
  readonly attributeGroup?: AttributeGroupRef[];
  readonly anyAttribute?: AnyAttribute;
}

/**
 * xs:attributeGroup (reference)
 */
export interface AttributeGroupRef extends Annotated {
  readonly ref: string;
}

// =============================================================================
// Wildcards
// =============================================================================

export interface Any extends Annotated {
  readonly minOccurs?: number | string;
  readonly maxOccurs?: number | string | 'unbounded';
  readonly namespace?: string;
  readonly processContents?: 'skip' | 'lax' | 'strict';
  readonly notNamespace?: string;
  readonly notQName?: string;
}

export interface AnyAttribute extends Annotated {
  readonly namespace?: string;
  readonly processContents?: 'skip' | 'lax' | 'strict';
  readonly notNamespace?: string;
  readonly notQName?: string;
}

// =============================================================================
// Identity Constraints
// =============================================================================

export interface Unique extends Annotated {
  readonly name: string;
  readonly ref?: string;
  readonly selector?: Selector;
  readonly field?: Field[];
}

export interface Key extends Annotated {
  readonly name: string;
  readonly ref?: string;
  readonly selector?: Selector;
  readonly field?: Field[];
}

export interface Keyref extends Annotated {
  readonly name: string;
  readonly ref?: string;
  readonly refer: string;
  readonly selector?: Selector;
  readonly field?: Field[];
}

export interface Selector extends Annotated {
  readonly xpath: string;
  readonly xpathDefaultNamespace?: string;
}

export interface Field extends Annotated {
  readonly xpath: string;
  readonly xpathDefaultNamespace?: string;
}

// =============================================================================
// XSD 1.1 Features
// =============================================================================

export interface OpenContent extends Annotated {
  readonly mode?: 'none' | 'interleave' | 'suffix';
  readonly any?: Any;
}

export interface DefaultOpenContent extends Annotated {
  readonly appliesToEmpty?: boolean;
  readonly mode?: 'interleave' | 'suffix';
  readonly any: Any;
}

export interface Assertion extends Annotated {
  readonly test?: string;
  readonly xpathDefaultNamespace?: string;
}

export interface Alternative extends Annotated {
  readonly test?: string;
  readonly type?: string;
  readonly xpathDefaultNamespace?: string;
  readonly simpleType?: LocalSimpleType;
  readonly complexType?: LocalComplexType;
}

export interface Notation extends Annotated {
  readonly name: string;
  readonly public: string;
  readonly system?: string;
}

// =============================================================================
// Union Type Aliases
// =============================================================================
// These union types work with both top-level and local variants.
// Use these in code that needs to handle elements/types from any context.

/** Element - either top-level or local */
export type Element = TopLevelElement | LocalElement;

/** ComplexType - either top-level (named) or local (inline) */
export type ComplexType = TopLevelComplexType | LocalComplexType;

/** SimpleType - either top-level (named) or local (inline) */
export type SimpleType = TopLevelSimpleType | LocalSimpleType;

/** Attribute - either top-level or local */
export type Attribute = TopLevelAttribute | LocalAttribute;

/** Group content (sequence, choice, all) */
export type Group = ExplicitGroup | All;
