/**
 * Schema Walker - Generator-based traversal for W3C Schema objects
 *
 * Provides a single source of truth for schema traversal logic.
 * All consumers (xml/parse, xml/build, interface-generator) use these
 * generators instead of reimplementing traversal.
 *
 * @example
 * ```typescript
 * // Find a complexType by name (stops at first match)
 * for (const { ct, schema } of walkComplexTypes(rootSchema)) {
 *   if (ct.name === 'PersonType') return { type: ct, schema };
 * }
 *
 * // Iterate all elements in a complexType (handles inheritance)
 * for (const { element, optional, array } of walkElements(complexType, schema)) {
 *   console.log(element.name, optional ? '?' : '', array ? '[]' : '');
 * }
 * ```
 */

// Using schema-like types because walker needs to work with both:
// 1. Parsed schemas at runtime (Schema from xsd/types.ts)
// 2. `as const` literals for type inference (readonly arrays)
// The "Like" types are loose enough to accept both.
import type {
  SchemaLike,
  ComplexTypeLike,
  ElementLike,
  AttributeLike,
  GroupLike,
  SimpleTypeLike,
} from '../xsd/schema-like';

// =============================================================================
// Types
// =============================================================================

/** Result of walking complexTypes */
export type ComplexTypeEntry = {
  readonly ct: ComplexTypeLike;
  readonly schema: SchemaLike;
};

/** Result of walking simpleTypes */
export type SimpleTypeEntry = {
  readonly st: SimpleTypeLike;
  readonly schema: SchemaLike;
};

/** Result of walking elements */
export type ElementEntry = {
  readonly element: ElementLike;
  /** Element is optional (minOccurs=0 or inside choice) */
  readonly optional: boolean;
  /** Element is array (maxOccurs > 1 or unbounded) */
  readonly array: boolean;
  /** Source group type */
  readonly source: 'sequence' | 'choice' | 'all' | 'extension';
};

/** Result of walking attributes */
export type AttributeEntry = {
  readonly attribute: AttributeLike;
  /** Attribute is required (use="required") */
  readonly required: boolean;
  /** Schema where the attribute is defined (for namespace prefix resolution) */
  readonly schema: SchemaLike;
};

/** Result of walking top-level elements */
export type TopLevelElementEntry = {
  readonly element: ElementLike;
  readonly schema: SchemaLike;
};

/** Options for schema-level walkers */
export type WalkOptions = {
  /** Only recurse into $includes, not $imports (default: false) */
  readonly includesOnly?: boolean;
};

// =============================================================================
// Schema-level Walkers (traverse $imports and $includes)
// =============================================================================

/**
 * Walk all complexTypes in a schema and its $imports/$includes (depth-first).
 *
 * @param schema - Root schema to start from
 * @param options - Walk options (e.g., includesOnly to skip $imports)
 * @yields ComplexType with the schema it was found in
 *
 * @example
 * ```typescript
 * function findComplexType(name: string, schema: SchemaLike) {
 *   for (const { ct, schema: s } of walkComplexTypes(schema)) {
 *     if (ct.name === name) return { type: ct, schema: s };
 *   }
 * }
 * ```
 */
export function* walkComplexTypes(
  schema: SchemaLike,
  options: WalkOptions = {},
): Generator<ComplexTypeEntry> {
  // Current schema's complexTypes
  const complexTypes = schema.complexType;
  if (complexTypes) {
    if (Array.isArray(complexTypes)) {
      for (const ct of complexTypes) {
        yield { ct, schema };
      }
    } else {
      // Object format: { TypeName: { ... } }
      for (const [name, ct] of Object.entries(complexTypes)) {
        yield { ct: { ...ct, name } as ComplexTypeLike, schema };
      }
    }
  }

  // Yield complexTypes from redefine blocks (these override types from included schemas)
  // Redefine types are yielded FIRST so findComplexType finds them before the original
  if (schema.redefine) {
    for (const redef of schema.redefine) {
      if (redef.complexType) {
        for (const ct of redef.complexType) {
          yield { ct, schema };
        }
      }
    }
  }

  // Yield complexTypes from override blocks (XSD 1.1)
  if (schema.override) {
    for (const ovr of schema.override) {
      if (ovr.complexType) {
        for (const ct of ovr.complexType) {
          yield { ct, schema };
        }
      }
    }
  }

  // Recurse into $includes (same namespace - content is merged)
  if (schema.$includes) {
    for (const included of schema.$includes) {
      yield* walkComplexTypes(included, options);
    }
  }

  // Recurse into $imports (different namespace) - skip if includesOnly
  if (!options.includesOnly && schema.$imports) {
    for (const imported of schema.$imports) {
      yield* walkComplexTypes(imported, options);
    }
  }
}

/**
 * Walk all simpleTypes in a schema and its $imports/$includes.
 */
export function* walkSimpleTypes(
  schema: SchemaLike,
  options: WalkOptions = {},
): Generator<SimpleTypeEntry> {
  const simpleTypes = schema.simpleType;
  if (simpleTypes) {
    if (Array.isArray(simpleTypes)) {
      for (const st of simpleTypes) {
        yield { st, schema };
      }
    } else {
      for (const [name, st] of Object.entries(simpleTypes)) {
        yield { st: { ...st, name } as SimpleTypeLike, schema };
      }
    }
  }

  // Yield simpleTypes from redefine blocks (these override types from included schemas)
  if (schema.redefine) {
    for (const redef of schema.redefine) {
      if (redef.simpleType) {
        for (const st of redef.simpleType) {
          yield { st, schema };
        }
      }
    }
  }

  // Yield simpleTypes from override blocks (XSD 1.1)
  if (schema.override) {
    for (const ovr of schema.override) {
      if (ovr.simpleType) {
        for (const st of ovr.simpleType) {
          yield { st, schema };
        }
      }
    }
  }

  // Recurse into $includes (same namespace)
  if (schema.$includes) {
    for (const included of schema.$includes) {
      yield* walkSimpleTypes(included, options);
    }
  }

  // Recurse into $imports (different namespace) - skip if includesOnly
  if (!options.includesOnly && schema.$imports) {
    for (const imported of schema.$imports) {
      yield* walkSimpleTypes(imported, options);
    }
  }
}

/**
 * Walk all top-level elements in a schema and its $imports/$includes.
 */
export function* walkTopLevelElements(
  schema: SchemaLike,
  options: WalkOptions = {},
): Generator<TopLevelElementEntry> {
  if (schema.element) {
    for (const element of schema.element) {
      yield { element, schema };
    }
  }

  // Recurse into $includes (same namespace)
  if (schema.$includes) {
    for (const included of schema.$includes) {
      yield* walkTopLevelElements(included, options);
    }
  }

  // Recurse into $imports (different namespace) - skip if includesOnly
  if (!options.includesOnly && schema.$imports) {
    for (const imported of schema.$imports) {
      yield* walkTopLevelElements(imported, options);
    }
  }
}

// =============================================================================
// Lookup Helpers (use walkers internally)
// =============================================================================

/**
 * Find a complexType by name, searching schema and $imports.
 * Returns both the type AND the schema it was found in (important for inheritance).
 */
export function findComplexType(
  name: string,
  schema: SchemaLike,
): ComplexTypeEntry | undefined {
  for (const entry of walkComplexTypes(schema)) {
    if (entry.ct.name === name) {
      return entry;
    }
  }
  return undefined;
}

/**
 * Find a simpleType by name, searching schema and $imports.
 */
export function findSimpleType(
  name: string,
  schema: SchemaLike,
): SimpleTypeEntry | undefined {
  for (const entry of walkSimpleTypes(schema)) {
    if (entry.st.name === name) {
      return entry;
    }
  }
  return undefined;
}

/**
 * Find a top-level element by name, searching schema and $imports.
 */
export function findElement(
  name: string,
  schema: SchemaLike,
): TopLevelElementEntry | undefined {
  for (const entry of walkTopLevelElements(schema)) {
    if (entry.element.name === name) {
      return entry;
    }
  }
  return undefined;
}

// =============================================================================
// ComplexType Content Walkers
// =============================================================================

/**
 * Walk all elements in a complexType, handling:
 * - sequence, choice, all groups
 * - Nested groups (recursive)
 * - complexContent/extension inheritance
 * - Group references
 *
 * @param ct - ComplexType to walk
 * @param schema - Schema context (for resolving base types and group refs)
 * @yields Elements with metadata (optional, array, source)
 */
export function* walkElements(
  ct: ComplexTypeLike,
  schema: SchemaLike,
): Generator<ElementEntry> {
  // Handle complexContent/extension (inheritance)
  if (ct.complexContent?.extension) {
    const ext = ct.complexContent.extension;

    // First yield inherited elements from base type
    if (ext.base) {
      const baseName = stripNsPrefix(ext.base);
      const baseEntry = findComplexType(baseName, schema);
      if (baseEntry) {
        // Use the schema where base was found for proper context
        yield* walkElements(baseEntry.ct, baseEntry.schema);
      }
    }

    // Then yield extension's own elements
    yield* walkGroup(ext.sequence, 'sequence', schema);
    yield* walkGroup(ext.choice, 'choice', schema);
    yield* walkGroup(ext.all, 'all', schema);

    // Handle group reference in extension
    if (ext.group?.ref) {
      yield* walkGroupRef(ext.group.ref, schema);
    }
    return;
  }

  // Handle complexContent/restriction
  if (ct.complexContent?.restriction) {
    const rest = ct.complexContent.restriction;
    yield* walkGroup(rest.sequence, 'sequence', schema);
    yield* walkGroup(rest.choice, 'choice', schema);
    yield* walkGroup(rest.all, 'all', schema);
    if (rest.group?.ref) {
      yield* walkGroupRef(rest.group.ref, schema);
    }
    return;
  }

  // Direct content (no complexContent)
  yield* walkGroup(ct.sequence, 'sequence', schema);
  yield* walkGroup(ct.choice, 'choice', schema);
  yield* walkGroup(ct.all, 'all', schema);

  // Handle group reference
  if (ct.group?.ref) {
    yield* walkGroupRef(ct.group.ref, schema);
  }
}

/**
 * Walk elements in a group (sequence/choice/all), handling nested groups.
 */
function* walkGroup(
  group: GroupLike | undefined,
  source: 'sequence' | 'choice' | 'all',
  schema: SchemaLike,
  parentOptional = false,
  parentArray = false,
): Generator<ElementEntry> {
  if (!group) return;

  // Check group-level minOccurs/maxOccurs
  const groupOptional =
    parentOptional || group.minOccurs === 0 || group.minOccurs === '0';
  const groupArray = parentArray || isArray(group);

  // Elements in choice are always optional (only one is selected)
  const choiceOptional = source === 'choice';

  // Yield direct elements
  if (group.element) {
    for (const element of group.element) {
      const optional =
        choiceOptional ||
        groupOptional ||
        element.minOccurs === 0 ||
        element.minOccurs === '0';
      const array = groupArray || isArray(element);

      // Handle element reference to abstract element with substitution group
      if (element.ref) {
        const refName = stripNsPrefix(element.ref);
        const refEntry = findElement(refName, schema);

        if (refEntry && isAbstractElement(refEntry.element)) {
          // Abstract element - yield substitutes if found in this schema
          const substitutes = findSubstitutes(refName, schema);
          if (substitutes.length > 0) {
            for (const sub of substitutes) {
              yield { element: sub, optional, array, source };
            }
            continue;
          }
          // No substitutes found in this schema - yield the original element
          // so the parser can handle substitution using the root schema
        }
      }

      yield { element, optional, array, source };
    }
  }

  // Recurse into nested sequences
  if (group.sequence) {
    const sequences = Array.isArray(group.sequence)
      ? group.sequence
      : [group.sequence];
    for (const nested of sequences) {
      yield* walkGroup(nested, 'sequence', schema, groupOptional, groupArray);
    }
  }

  // Recurse into nested choices (elements become optional)
  if (group.choice) {
    const choices = Array.isArray(group.choice) ? group.choice : [group.choice];
    for (const nested of choices) {
      yield* walkGroup(
        nested,
        'choice',
        schema,
        true,
        groupArray || isArray(nested),
      );
    }
  }

  // Handle group references within the group
  if (group.group) {
    const refs = Array.isArray(group.group) ? group.group : [group.group];
    for (const ref of refs) {
      if (ref.ref) {
        yield* walkGroupRef(
          ref.ref,
          schema,
          groupOptional || choiceOptional,
          groupArray || isArray(ref),
        );
      }
    }
  }
}

/**
 * Walk elements from a group reference (xs:group ref="...").
 */
function* walkGroupRef(
  ref: string,
  schema: SchemaLike,
  parentOptional = false,
  parentArray = false,
): Generator<ElementEntry> {
  const groupName = stripNsPrefix(ref);
  const group = findGroup(groupName, schema);

  if (group) {
    // Group can have sequence/choice/all
    if (group.sequence) {
      yield* walkGroup(
        group.sequence,
        'sequence',
        schema,
        parentOptional,
        parentArray,
      );
    }
    if (group.choice) {
      yield* walkGroup(group.choice, 'choice', schema, true, parentArray);
    }
    if (group.all) {
      yield* walkGroup(group.all, 'all', schema, parentOptional, parentArray);
    }
  }
}

/**
 * Walk all attributes in a complexType, handling:
 * - Direct attributes
 * - complexContent/extension attributes
 * - simpleContent/extension attributes
 * - Inherited attributes from base type
 * - AttributeGroup references
 */
export function* walkAttributes(
  ct: ComplexTypeLike,
  schema: SchemaLike,
): Generator<AttributeEntry> {
  // Handle complexContent/extension
  if (ct.complexContent?.extension) {
    const ext = ct.complexContent.extension;

    // Inherited attributes from base
    if (ext.base) {
      const baseName = stripNsPrefix(ext.base);
      const baseEntry = findComplexType(baseName, schema);
      if (baseEntry) {
        yield* walkAttributes(baseEntry.ct, baseEntry.schema);
      }
    }

    // Extension's own attributes (resolve refs)
    if (ext.attribute) {
      for (const attr of ext.attribute) {
        const resolved = resolveAttribute(attr, schema);
        if (resolved) {
          yield {
            attribute: resolved,
            required: resolved.use === 'required',
            schema,
          };
        }
      }
    }

    // AttributeGroup references
    yield* walkAttributeGroupRefs(ext.attributeGroup, schema);
    return;
  }

  // Handle simpleContent/extension
  if (ct.simpleContent?.extension) {
    const ext = ct.simpleContent.extension;
    if (ext.attribute) {
      for (const attr of ext.attribute) {
        const resolved = resolveAttribute(attr, schema);
        if (resolved) {
          yield {
            attribute: resolved,
            required: resolved.use === 'required',
            schema,
          };
        }
      }
    }
    yield* walkAttributeGroupRefs(ext.attributeGroup, schema);
    return;
  }

  // Direct attributes (resolve refs)
  if (ct.attribute) {
    for (const attr of ct.attribute) {
      const resolved = resolveAttribute(attr, schema);
      if (resolved) {
        yield {
          attribute: resolved,
          required: resolved.use === 'required',
          schema,
        };
      }
    }
  }

  // AttributeGroup references
  yield* walkAttributeGroupRefs(ct.attributeGroup, schema);
}

/**
 * Walk attributes from attributeGroup references.
 */
function* walkAttributeGroupRefs(
  refs: readonly unknown[] | undefined,
  schema: SchemaLike,
): Generator<AttributeEntry> {
  if (!refs) return;

  for (const ref of refs) {
    const refObj = ref as { ref?: string };
    if (refObj.ref) {
      const groupName = stripNsPrefix(refObj.ref);
      const group = findAttributeGroup(groupName, schema);
      if (group?.attribute) {
        for (const attribute of group.attribute as AttributeLike[]) {
          yield { attribute, required: attribute.use === 'required', schema };
        }
      }
    }
  }
}

// =============================================================================
// Group/AttributeGroup Finders
// =============================================================================

/**
 * Find a named group (xs:group) by name.
 */
function findGroup(
  name: string,
  schema: SchemaLike,
): { sequence?: GroupLike; choice?: GroupLike; all?: GroupLike } | undefined {
  // Search in current schema
  if (schema.group) {
    for (const g of schema.group as Array<{
      name?: string;
      sequence?: GroupLike;
      choice?: GroupLike;
      all?: GroupLike;
    }>) {
      if (g.name === name) return g;
    }
  }

  // Search in $includes (same namespace)
  if (schema.$includes) {
    for (const included of schema.$includes) {
      const found = findGroup(name, included);
      if (found) return found;
    }
  }

  // Search in $imports (different namespace)
  if (schema.$imports) {
    for (const imported of schema.$imports) {
      const found = findGroup(name, imported);
      if (found) return found;
    }
  }

  return undefined;
}

/**
 * Find a top-level attribute by name.
 * Searches current schema and $imports.
 */
function findAttribute(
  name: string,
  schema: SchemaLike,
): AttributeLike | undefined {
  // Search in current schema's top-level attributes
  const schemaWithAttrs = schema as { attribute?: readonly AttributeLike[] };
  if (schemaWithAttrs.attribute) {
    for (const attr of schemaWithAttrs.attribute) {
      if (attr.name === name) return attr;
    }
  }

  // Search in $includes (same namespace)
  if (schema.$includes) {
    for (const included of schema.$includes) {
      const found = findAttribute(name, included);
      if (found) return found;
    }
  }

  // Search in $imports (different namespace)
  if (schema.$imports) {
    for (const imported of schema.$imports) {
      const found = findAttribute(name, imported);
      if (found) return found;
    }
  }

  return undefined;
}

/**
 * Resolve an attribute - handles both direct attributes and refs.
 * Returns the resolved attribute with its name.
 */
function resolveAttribute(
  attribute: AttributeLike,
  schema: SchemaLike,
): AttributeLike | undefined {
  // If attribute has a ref, resolve it
  if (attribute.ref) {
    const refName = stripNsPrefix(attribute.ref);
    const resolved = findAttribute(refName, schema);
    if (resolved) {
      // Merge ref's use with resolved attribute
      return {
        ...resolved,
        use: attribute.use ?? resolved.use,
      } as AttributeLike;
    }
    // Fallback: create attribute with ref name
    return {
      name: refName,
      type: 'xs:string',
      use: attribute.use,
    } as AttributeLike;
  }
  // Direct attribute
  return attribute;
}

/**
 * Find an attributeGroup by name.
 */
function findAttributeGroup(
  name: string,
  schema: SchemaLike,
): { attribute?: readonly AttributeLike[] } | undefined {
  if (schema.attributeGroup) {
    for (const g of schema.attributeGroup as Array<{
      name?: string;
      attribute?: readonly AttributeLike[];
    }>) {
      if (g.name === name) return g;
    }
  }

  // Search in $includes (same namespace)
  if (schema.$includes) {
    for (const included of schema.$includes) {
      const found = findAttributeGroup(name, included);
      if (found) return found;
    }
  }

  // Search in $imports (different namespace)
  if (schema.$imports) {
    for (const imported of schema.$imports) {
      const found = findAttributeGroup(name, imported);
      if (found) return found;
    }
  }

  return undefined;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Strip namespace prefix from a QName (e.g., "tns:PersonType" -> "PersonType")
 */
export function stripNsPrefix(name: string): string {
  const colonIndex = name.indexOf(':');
  return colonIndex >= 0 ? name.slice(colonIndex + 1) : name;
}

/**
 * Check if element/group has maxOccurs > 1 (is array)
 */
function isArray(item: { maxOccurs?: number | string | 'unbounded' }): boolean {
  if (item.maxOccurs === 'unbounded') return true;
  if (typeof item.maxOccurs === 'number') return item.maxOccurs > 1;
  if (typeof item.maxOccurs === 'string') {
    if (item.maxOccurs === 'unbounded') return true;
    const num = parseInt(item.maxOccurs, 10);
    return !isNaN(num) && num > 1;
  }
  return false;
}

// =============================================================================
// Substitution Group Support
// =============================================================================

/**
 * Check if an element is abstract
 */
export function isAbstractElement(element: ElementLike): boolean {
  return (
    (element as { abstract?: boolean | string }).abstract === true ||
    (element as { abstract?: boolean | string }).abstract === 'true'
  );
}

/**
 * Find all elements that substitute for a given abstract element.
 * This handles XSD substitution groups where concrete elements can
 * substitute for an abstract element.
 */
export function findSubstitutes(
  abstractElementName: string,
  schema: SchemaLike,
): ElementLike[] {
  const substitutes: ElementLike[] = [];

  // Walk all top-level elements looking for substitutionGroup
  for (const { element } of walkTopLevelElements(schema)) {
    const subGroup = (element as { substitutionGroup?: string })
      .substitutionGroup;
    if (subGroup) {
      const subGroupName = stripNsPrefix(subGroup);
      if (subGroupName === abstractElementName) {
        substitutes.push(element);
      }
    }
  }

  return substitutes;
}
