/**
 * Type Inference Utilities for W3C XSD Schema
 *
 * These types enable inferring TypeScript types directly from W3C-compliant
 * Schema objects defined with `as const`.
 *
 * This file contains ONLY inference utilities (InferSchema, InferElement, etc.)
 * The schema-like type definitions are in ./schema-like.ts
 */

import type {
  SchemaLike,
  ElementLike,
  ComplexTypeLike,
  SimpleTypeLike,
  GroupLike,
  AttributeLike,
  ExtensionLike,
  SimpleExtensionLike,
} from '../xsd/schema-like';

// =============================================================================
// Main Entry Points
// =============================================================================

/**
 * Infer TypeScript type from a W3C Schema.
 *
 * For schemas with multiple root elements, returns a union of all possible
 * document types. Use type guards or discriminated unions to narrow.
 *
 * @example
 * ```typescript
 * const schema = {
 *   element: [
 *     { name: 'Person', type: 'PersonType' },
 *     { name: 'Company', type: 'CompanyType' }
 *   ],
 *   complexType: [...]
 * } as const;
 *
 * type Data = InferSchema<typeof schema>;
 * // PersonType | CompanyType (union of all root element types)
 * ```
 */
export type InferSchema<T extends SchemaLike> =
  T['element'] extends readonly ElementLike[]
    ? InferRootElementTypes<T['element'], T>
    : unknown;

/**
 * Infer union of all root element types (content only, not wrapped).
 * Each root element's type is inferred and combined into a union.
 * Use InferParsedSchema for parse() return type which wraps with element name.
 */
export type InferRootElementTypes<
  E extends readonly ElementLike[],
  T extends SchemaLike,
> = E[number] extends infer El
  ? El extends ElementLike
    ? El extends { type: infer TypeName }
      ? TypeName extends string
        ? InferTypeName<TypeName, T>
        : El extends { name: infer N }
          ? N extends string
            ? InferTypeName<N, T>
            : unknown
          : unknown
      : El extends { name: infer N }
        ? N extends string
          ? InferTypeName<N, T>
          : unknown
        : unknown
    : unknown
  : unknown;

/**
 * Infer wrapped type for parse() function output.
 * Returns { ElementName: ContentType } to match parse() runtime behavior.
 *
 * @example
 * ```typescript
 * const result = parse(schema, xml);
 * // result is { Person: { firstName: string, ... } }
 * ```
 */
export type InferParsedSchema<T extends SchemaLike> =
  T['element'] extends readonly ElementLike[]
    ? InferWrappedRootElementTypes<T['element'], T>
    : unknown;

/**
 * Infer wrapped root element types for parse() output.
 * Each root element's type is wrapped with its name: { ElementName: ContentType }
 */
export type InferWrappedRootElementTypes<
  E extends readonly ElementLike[],
  T extends SchemaLike,
> = E[number] extends infer El
  ? El extends ElementLike
    ? El extends { name: infer N }
      ? N extends string
        ? El extends { type: infer TypeName }
          ? TypeName extends string
            ? { [K in N]: InferTypeName<TypeName, T> }
            : { [K in N]: InferTypeName<N, T> }
          : { [K in N]: InferTypeName<N, T> }
        : unknown
      : unknown
    : unknown
  : unknown;

/**
 * Infer TypeScript type for a specific element by name.
 *
 * @example
 * ```typescript
 * type Person = InferElement<typeof schema, 'Person'>;
 * ```
 */
export type InferElement<T extends SchemaLike, ElementName extends string> =
  FindByName<T['element'], ElementName> extends infer Found
    ? Found extends { type: infer TypeName }
      ? TypeName extends string
        ? InferTypeName<TypeName, T>
        : InferTypeName<ElementName, T>
      : Found extends { name: ElementName }
        ? InferTypeName<ElementName, T>
        : never
    : never;

/**
 * Infer all elements as a union type.
 *
 * @example
 * ```typescript
 * type AnyElement = InferAllElements<typeof schema>;
 * // Person | Address | ...
 * ```
 */
export type InferAllElements<T extends SchemaLike> =
  T['element'] extends readonly { name: string; type?: string }[]
    ? T['element'][number] extends { type?: infer TypeName }
      ? TypeName extends string
        ? InferTypeName<TypeName, T>
        : never
      : never
    : never;

// =============================================================================
// Type Resolution
// =============================================================================

/** Strip any namespace prefix from a type name (e.g., "tns:PersonType" -> "PersonType") */
export type StripNsPrefix<T extends string> =
  T extends `${string}:${infer LocalName}` ? LocalName : T;

/** Resolve a type name to its TypeScript type */
export type InferTypeName<TypeName extends string, T extends SchemaLike> =
  // Check for XSD built-in types first (xs:string, xsd:int, etc.)
  TypeName extends `xs:${infer BuiltIn}` | `xsd:${infer BuiltIn}`
    ? InferBuiltInType<BuiltIn>
    : TypeName extends keyof XsdBuiltInTypes
      ? XsdBuiltInTypes[TypeName]
      : // Strip namespace prefix and look up in schema types
        // Use FindComplexTypeWithSchema to get both the type AND the schema it was found in
        FindComplexTypeWithSchema<
            StripNsPrefix<TypeName>,
            T
          > extends infer Result
        ? Result extends { type: infer CT; schema: infer S }
          ? CT extends ComplexTypeLike
            ? S extends SchemaLike
              ? InferComplexType<CT, S> // Use the schema where the type was found!
              : unknown
            : unknown
          : // Not found in complexType, look up in simpleType
            FindSimpleTypeWithSchema<
                StripNsPrefix<TypeName>,
                T
              > extends infer STResult
            ? STResult extends { type: infer ST; schema: infer _S }
              ? ST extends SimpleTypeLike
                ? InferSimpleType<ST>
                : unknown
              : unknown
            : unknown
        : unknown;

/** Find a complexType by name (searches in schema and $imports) */
export type FindComplexType<Name extends string, T extends SchemaLike> =
  // First try to find in current schema
  FindComplexTypeLocal<Name, T> extends infer Local
    ? [Local] extends [never]
      ? // Not found locally, search in $imports
        FindComplexTypeInImports<Name, T>
      : Local
    : never;

/** Find complexType WITH the schema it was found in (for proper context in inheritance) */
export type FindComplexTypeWithSchema<
  Name extends string,
  T extends SchemaLike,
> =
  // First try to find in current schema
  FindComplexTypeLocal<Name, T> extends infer Local
    ? [Local] extends [never]
      ? // Not found locally, search in $imports
        FindComplexTypeInImportsWithSchema<Name, T>
      : { type: Local; schema: T }
    : never;

/** Find complexType in $imports, returning both type and schema */
export type FindComplexTypeInImportsWithSchema<
  Name extends string,
  T extends SchemaLike,
> = T['$imports'] extends readonly SchemaLike[]
  ? FindComplexTypeInSchemaArrayWithSchema<Name, T['$imports']>
  : never;

/** Search through array of schemas for complexType, returning both type and schema */
export type FindComplexTypeInSchemaArrayWithSchema<
  Name extends string,
  Schemas extends readonly SchemaLike[],
> = Schemas extends readonly [infer First, ...infer Rest]
  ? First extends SchemaLike
    ? FindComplexTypeWithSchema<Name, First> extends infer Found
      ? [Found] extends [never]
        ? Rest extends readonly SchemaLike[]
          ? FindComplexTypeInSchemaArrayWithSchema<Name, Rest>
          : never
        : Found extends { type: ComplexTypeLike; schema: SchemaLike }
          ? Found
          : Rest extends readonly SchemaLike[]
            ? FindComplexTypeInSchemaArrayWithSchema<Name, Rest>
            : never
      : never
    : never
  : never;

/** Find complexType in current schema only */
export type FindComplexTypeLocal<
  Name extends string,
  T extends SchemaLike,
> = T['complexType'] extends readonly ComplexTypeLike[]
  ? FindInArray<T['complexType'], { name: Name }>
  : T['complexType'] extends { readonly [key: string]: ComplexTypeLike }
    ? Name extends keyof T['complexType']
      ? T['complexType'][Name]
      : never
    : never;

/** Find complexType in $imports (recursive) */
export type FindComplexTypeInImports<
  Name extends string,
  T extends SchemaLike,
> = T['$imports'] extends readonly SchemaLike[]
  ? FindComplexTypeInSchemaArray<Name, T['$imports']>
  : never;

/** Search through array of schemas for complexType */
export type FindComplexTypeInSchemaArray<
  Name extends string,
  Schemas extends readonly SchemaLike[],
> = Schemas extends readonly [infer First, ...infer Rest]
  ? First extends SchemaLike
    ? FindComplexType<Name, First> extends infer Found
      ? [Found] extends [never]
        ? Rest extends readonly SchemaLike[]
          ? FindComplexTypeInSchemaArray<Name, Rest>
          : never
        : Found
      : never
    : never
  : never;

/** Find a simpleType by name (searches in schema and $imports) */
export type FindSimpleType<Name extends string, T extends SchemaLike> =
  // First try to find in current schema
  FindSimpleTypeLocal<Name, T> extends infer Local
    ? [Local] extends [never]
      ? // Not found locally, search in $imports
        FindSimpleTypeInImports<Name, T>
      : Local
    : never;

/** Find simpleType in current schema only */
export type FindSimpleTypeLocal<
  Name extends string,
  T extends SchemaLike,
> = T['simpleType'] extends readonly SimpleTypeLike[]
  ? FindInArray<T['simpleType'], { name: Name }>
  : T['simpleType'] extends { readonly [key: string]: SimpleTypeLike }
    ? Name extends keyof T['simpleType']
      ? T['simpleType'][Name]
      : never
    : never;

/** Find simpleType in $imports (recursive) */
export type FindSimpleTypeInImports<
  Name extends string,
  T extends SchemaLike,
> = T['$imports'] extends readonly SchemaLike[]
  ? FindSimpleTypeInSchemaArray<Name, T['$imports']>
  : never;

/** Search through array of schemas for simpleType */
export type FindSimpleTypeInSchemaArray<
  Name extends string,
  Schemas extends readonly SchemaLike[],
> = Schemas extends readonly [infer First, ...infer Rest]
  ? First extends SchemaLike
    ? FindSimpleType<Name, First> extends infer Found
      ? [Found] extends [never]
        ? Rest extends readonly SchemaLike[]
          ? FindSimpleTypeInSchemaArray<Name, Rest>
          : never
        : Found
      : never
    : never
  : never;

/** Find simpleType WITH the schema it was found in */
export type FindSimpleTypeWithSchema<
  Name extends string,
  T extends SchemaLike,
> =
  // First try to find in current schema
  FindSimpleTypeLocal<Name, T> extends infer Local
    ? [Local] extends [never]
      ? // Not found locally, search in $imports
        FindSimpleTypeInImportsWithSchema<Name, T>
      : { type: Local; schema: T }
    : never;

/** Find simpleType in $imports, returning both type and schema */
export type FindSimpleTypeInImportsWithSchema<
  Name extends string,
  T extends SchemaLike,
> = T['$imports'] extends readonly SchemaLike[]
  ? FindSimpleTypeInSchemaArrayWithSchema<Name, T['$imports']>
  : never;

/** Search through array of schemas for simpleType, returning both type and schema */
export type FindSimpleTypeInSchemaArrayWithSchema<
  Name extends string,
  Schemas extends readonly SchemaLike[],
> = Schemas extends readonly [infer First, ...infer Rest]
  ? First extends SchemaLike
    ? FindSimpleTypeWithSchema<Name, First> extends infer Found
      ? [Found] extends [never]
        ? Rest extends readonly SchemaLike[]
          ? FindSimpleTypeInSchemaArrayWithSchema<Name, Rest>
          : never
        : Found extends { type: SimpleTypeLike; schema: SchemaLike }
          ? Found
          : Rest extends readonly SchemaLike[]
            ? FindSimpleTypeInSchemaArrayWithSchema<Name, Rest>
            : never
      : never
    : never
  : never;

// =============================================================================
// ComplexType Inference
// =============================================================================

/** Infer type from a complexType definition */
export type InferComplexType<CT extends ComplexTypeLike, T extends SchemaLike> =
  // Handle complexContent extension (inheritance)
  CT['complexContent'] extends { extension: infer Ext }
    ? Ext extends ExtensionLike
      ? InferExtension<Ext, T> & InferComplexTypeContent<CT, T>
      : InferComplexTypeContent<CT, T>
    : // Handle simpleContent extension (text content with attributes)
      CT['simpleContent'] extends { extension: infer Ext }
      ? Ext extends SimpleExtensionLike
        ? InferSimpleContentExtension<Ext, T>
        : InferComplexTypeContent<CT, T>
      : InferComplexTypeContent<CT, T>;

/** Infer content from complexType (sequence, choice, all, attributes) */
export type InferComplexTypeContent<
  CT extends ComplexTypeLike,
  T extends SchemaLike,
> = InferGroup<CT['sequence'], T> &
  InferGroup<CT['all'], T> &
  InferChoice<CT['choice'], T> &
  InferAttributes<CT['attribute']>;

/** Empty object type for conditional fallbacks - use {} not Record<string, never> to avoid intersection issues */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type EmptyObject = {};

/** Infer from complexContent/extension */
export type InferExtension<Ext extends ExtensionLike, T extends SchemaLike> =
  // Inherit from base type
  (Ext['base'] extends string ? InferTypeName<Ext['base'], T> : EmptyObject) &
    // Add own content
    InferGroup<Ext['sequence'], T> &
    InferGroup<Ext['all'], T> &
    InferChoice<Ext['choice'], T> &
    InferAttributes<Ext['attribute']>;

/** Infer from simpleContent/extension (text content + attributes) */
export type InferSimpleContentExtension<
  Ext extends SimpleExtensionLike,
  _T extends SchemaLike,
> = (Ext['base'] extends string
  ? { $value: InferBuiltInType<StripPrefix<Ext['base']>> }
  : EmptyObject) &
  InferAttributes<Ext['attribute']>;

// =============================================================================
// Group Inference (sequence, all, choice)
// =============================================================================

/** Infer from a group (sequence or all) */
export type InferGroup<G, T extends SchemaLike> = G extends GroupLike
  ? InferElements<G['element'], T> &
      InferNestedSequences<G['sequence'], T> &
      InferNestedChoices<G['choice'], T>
  : EmptyObject;

/** Infer from choice (union of possibilities) */
export type InferChoice<G, T extends SchemaLike> = G extends GroupLike
  ? Partial<InferElements<G['element'], T>>
  : EmptyObject;

/** Infer nested sequences */
export type InferNestedSequences<
  S,
  T extends SchemaLike,
> = S extends readonly GroupLike[]
  ? UnionToIntersection<InferGroup<S[number], T>>
  : EmptyObject;

/** Infer nested choices */
export type InferNestedChoices<
  C,
  T extends SchemaLike,
> = C extends readonly GroupLike[]
  ? Partial<UnionToIntersection<InferGroup<C[number], T>>>
  : EmptyObject;

// =============================================================================
// Element Inference
// =============================================================================

/** Infer from element array */
export type InferElements<
  E,
  T extends SchemaLike,
> = E extends readonly ElementLike[]
  ? InferRequiredElements<E, T> & InferOptionalElements<E, T>
  : EmptyObject;

/** Find element by name or ref (after stripping prefix) */
type FindElementByName<E extends readonly ElementLike[], K extends string> =
  Extract<E[number], { name: K }> extends never
    ? E[number] extends infer El
      ? El extends { ref: infer R }
        ? R extends string
          ? StripPrefix<R> extends K
            ? El
            : never
          : never
        : never
      : never
    : Extract<E[number], { name: K }>;

/** Infer required elements (minOccurs != 0) */
export type InferRequiredElements<
  E extends readonly ElementLike[],
  T extends SchemaLike,
> = {
  [K in ExtractRequiredElementNames<E>]: InferElementType<
    FindElementByName<E, K>,
    T
  >;
};

/** Infer optional elements (minOccurs = 0) */
export type InferOptionalElements<
  E extends readonly ElementLike[],
  T extends SchemaLike,
> = {
  [K in ExtractOptionalElementNames<E>]?: InferElementType<
    FindElementByName<E, K>,
    T
  >;
};

/** Get element name - handles both name and ref (strips prefix from ref) */
type GetElementName<El> = El extends { name: infer N }
  ? N extends string
    ? N
    : never
  : El extends { ref: infer R }
    ? R extends string
      ? StripPrefix<R>
      : never
    : never;

/** Check if element is optional (minOccurs is 0 or '0') */
type ElementIsOptional<El> = El extends { minOccurs: infer M }
  ? M extends 0 | '0'
    ? true
    : false
  : false;

/** Extract names of required elements (distributive over union) */
export type ExtractRequiredElementNames<E extends readonly ElementLike[]> = {
  [K in keyof E]: E[K] extends ElementLike
    ? ElementIsOptional<E[K]> extends true
      ? never
      : GetElementName<E[K]>
    : never;
}[number];

/** Extract names of optional elements (distributive over union) */
export type ExtractOptionalElementNames<E extends readonly ElementLike[]> = {
  [K in keyof E]: E[K] extends ElementLike
    ? ElementIsOptional<E[K]> extends true
      ? GetElementName<E[K]>
      : never
    : never;
}[number];

/** Infer type for a single element */
export type InferElementType<El extends ElementLike, T extends SchemaLike> =
  // Check for element reference (ref="prefix:elementName")
  El extends { ref: infer Ref }
    ? Ref extends string
      ? WrapArray<InferElementRef<Ref, T>, El>
      : WrapArray<unknown, El>
    : // Check for inline complexType
      El extends { complexType: infer CT }
      ? CT extends ComplexTypeLike
        ? WrapArray<InferComplexType<CT, T>, El>
        : WrapArray<unknown, El>
      : // Check for inline simpleType
        El extends { simpleType: infer ST }
        ? ST extends SimpleTypeLike
          ? WrapArray<InferSimpleType<ST>, El>
          : WrapArray<unknown, El>
        : // Reference to named type
          El extends { type: infer TypeName }
          ? TypeName extends string
            ? WrapArray<InferTypeName<TypeName, T>, El>
            : WrapArray<unknown, El>
          : WrapArray<unknown, El>;

/** Infer type for an element reference - looks up the element in schema or $imports */
type InferElementRef<Ref extends string, T extends SchemaLike> =
  // First try to find in current schema's elements
  FindByName<T['element'], StripPrefix<Ref>> extends infer Found
    ? [Found] extends [never]
      ? // Not found in current schema - try $imports
        InferElementFromImports<Ref, T>
      : // Found in current schema
        Found extends ElementLike
        ? InferFoundElement<Found, T>
        : unknown
    : unknown;

/** Infer type from a found element */
type InferFoundElement<
  Found extends ElementLike,
  T extends SchemaLike,
> = Found extends { type: infer TypeName }
  ? TypeName extends string
    ? InferTypeName<TypeName, T>
    : unknown
  : Found extends { complexType: infer CT }
    ? CT extends ComplexTypeLike
      ? InferComplexType<CT, T>
      : unknown
    : unknown;

/** Try to find and infer element from $imports */
type InferElementFromImports<Ref extends string, T extends SchemaLike> =
  FindElementInImports<Ref, T['$imports']> extends infer ImportedEl
    ? [ImportedEl] extends [never]
      ? unknown
      : ImportedEl extends ElementLike
        ? InferFoundElement<ImportedEl, T>
        : unknown
    : unknown;

/** Find element in $imports array */
type FindElementInImports<
  Ref extends string,
  Imports,
> = Imports extends readonly SchemaLike[]
  ? Imports[number] extends infer S
    ? S extends SchemaLike
      ? FindByName<S['element'], StripPrefix<Ref>>
      : never
    : never
  : never;

/** Wrap in array if maxOccurs > 1 or unbounded */
export type WrapArray<T, El extends ElementLike> = El extends {
  maxOccurs: 'unbounded' | infer Max;
}
  ? Max extends 'unbounded'
    ? T[]
    : Max extends number
      ? Max extends 0 | 1
        ? T
        : T[]
      : Max extends '0' | '1'
        ? T // String '0' or '1' - single element
        : Max extends `${number}`
          ? T[] // String number > 1
          : T
  : T;

// =============================================================================
// Attribute Inference
// =============================================================================

/** Infer from attribute array */
export type InferAttributes<A> = A extends readonly AttributeLike[]
  ? InferRequiredAttributes<A> & InferOptionalAttributes<A>
  : EmptyObject;

/** Infer required attributes (use="required") */
export type InferRequiredAttributes<A extends readonly AttributeLike[]> = {
  [K in ExtractRequiredAttributeNames<A>]: InferAttributeType<
    Extract<A[number], { name: K }>
  >;
};

/** Infer optional attributes (use != "required") */
export type InferOptionalAttributes<A extends readonly AttributeLike[]> = {
  [K in ExtractOptionalAttributeNames<A>]?: InferAttributeType<
    Extract<A[number], { name: K }>
  >;
};

/** Extract names of required attributes */
export type ExtractRequiredAttributeNames<A extends readonly AttributeLike[]> =
  A[number] extends infer Attr
    ? Attr extends { name: infer N; use: 'required' }
      ? N extends string
        ? N
        : never
      : never
    : never;

/** Extract names of optional attributes */
export type ExtractOptionalAttributeNames<A extends readonly AttributeLike[]> =
  A[number] extends infer Attr
    ? Attr extends { name: infer N; use?: infer Use }
      ? Use extends 'required'
        ? never
        : N extends string
          ? N
          : never
      : never
    : never;

/** Infer type for a single attribute */
export type InferAttributeType<Attr extends AttributeLike> = Attr extends {
  type: infer TypeName;
}
  ? TypeName extends string
    ? InferBuiltInType<StripPrefix<TypeName>>
    : string
  : string;

// =============================================================================
// SimpleType Inference
// =============================================================================

/** Infer from simpleType (enums, restrictions) */
export type InferSimpleType<ST extends SimpleTypeLike> = ST extends {
  restriction: { enumeration: readonly { value: infer V }[] };
}
  ? V extends string
    ? V
    : string
  : ST extends { restriction: { base: infer Base } }
    ? Base extends string
      ? InferBuiltInType<StripPrefix<Base>>
      : string
    : string;

// =============================================================================
// Built-in XSD Types
// =============================================================================

/** Map XSD built-in types to TypeScript */
export type XsdBuiltInTypes = {
  string: string;
  normalizedString: string;
  token: string;
  language: string;
  Name: string;
  NCName: string;
  ID: string;
  IDREF: string;
  IDREFS: string[];
  ENTITY: string;
  ENTITIES: string[];
  NMTOKEN: string;
  NMTOKENS: string[];
  boolean: boolean;
  base64Binary: string;
  hexBinary: string;
  float: number;
  double: number;
  decimal: number;
  integer: number;
  nonPositiveInteger: number;
  negativeInteger: number;
  long: number;
  int: number;
  short: number;
  byte: number;
  nonNegativeInteger: number;
  unsignedLong: number;
  unsignedInt: number;
  unsignedShort: number;
  unsignedByte: number;
  positiveInteger: number;
  date: string;
  time: string;
  dateTime: string;
  duration: string;
  gYear: string;
  gYearMonth: string;
  gMonth: string;
  gMonthDay: string;
  gDay: string;
  anyURI: string;
  QName: string;
  NOTATION: string;
  anyType: unknown;
  anySimpleType: string | number | boolean;
};

/** Infer built-in type by name */
export type InferBuiltInType<Name extends string> =
  Name extends keyof XsdBuiltInTypes ? XsdBuiltInTypes[Name] : unknown;

// =============================================================================
// Utility Types
// =============================================================================

/** Strip any namespace prefix (e.g., xs:string -> string, atom:link -> link) */
export type StripPrefix<T extends string> = T extends `${string}:${infer Rest}`
  ? Rest
  : T;

/** Find item in array by partial match */
export type FindInArray<Arr, Match> = Arr extends readonly [
  infer First,
  ...infer Rest,
]
  ? First extends Match
    ? First
    : FindInArray<Rest, Match>
  : Arr extends readonly (infer Item)[]
    ? Item extends Match
      ? Extract<Item, Match>
      : never
    : never;

/**
 * Find item in array by name property.
 * Works with both literal types ('abapClass') and widened types (string).
 * For widened arrays where name is `string`, returns the full item union.
 */
export type FindByName<Arr, Name extends string> =
  // First try tuple matching (preserves literal types)
  Arr extends readonly [infer First, ...infer Rest]
    ? First extends { name: Name }
      ? First
      : First extends { name: string }
        ? Name extends First['name'] // Check if Name is assignable to the item's name
          ? First
          : FindByName<Rest, Name>
        : FindByName<Rest, Name>
    : // Fallback for non-tuple arrays (widened types)
      Arr extends readonly (infer Item)[]
      ? Item extends { name: infer ItemName }
        ? ItemName extends string
          ? // If item name is literal, check exact match
            string extends ItemName
            ? // Item name is widened to `string`, so any Name matches
              Item
            : // Item name is literal, check if Name matches
              Name extends ItemName
              ? Item
              : never
          : never
        : never
      : never;

/** Convert union to intersection */
export type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;
