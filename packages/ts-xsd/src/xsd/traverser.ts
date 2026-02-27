/**
 * Schema Traverser - OO pattern for XSD schema traversal
 *
 * Uses real W3C XSD types from types.ts (not the *Like inference types).
 * Subclass and override `on*` methods to handle specific node types.
 * Context is available via `this` - no parameter passing needed.
 *
 * @example
 * ```typescript
 * class TypeCollector extends SchemaTraverser {
 *   readonly types: TopLevelComplexType[] = [];
 *
 *   protected override onComplexType(ct: TopLevelComplexType): void {
 *     this.types.push(ct);
 *     // Access context: this.currentSchema, this.source, this.depth
 *   }
 * }
 *
 * const collector = new TypeCollector();
 * collector.traverse(schema);
 * console.log(collector.types);
 * ```
 */

import type {
  Schema,
  TopLevelComplexType,
  TopLevelSimpleType,
  TopLevelElement,
  TopLevelAttribute,
  NamedGroup,
  NamedAttributeGroup,
  Redefine,
  Override,
} from './types';

// =============================================================================
// Types
// =============================================================================

/** Source of a node in the schema hierarchy */
export type NodeSource =
  | 'direct'
  | 'redefine'
  | 'override'
  | 'include'
  | 'import';

/** Traversal options */
export interface TraverseOptions {
  /** Include $imports in traversal (default: true) */
  readonly includeImports?: boolean;
  /** Include $includes in traversal (default: true) */
  readonly includeIncludes?: boolean;
  /** Maximum depth to traverse (default: unlimited) */
  readonly maxDepth?: number;
}

// =============================================================================
// Schema Traverser - Base class for OO traversal
// =============================================================================

/**
 * Base class for OO schema traversal using real W3C XSD types.
 *
 * Subclass and override the `on*` methods you need.
 * Context is available via `this` - no parameter passing needed.
 */
export abstract class SchemaTraverser {
  // -------------------------------------------------------------------------
  // Context - Available via `this` in subclasses
  // -------------------------------------------------------------------------

  /** Root schema being traversed */
  protected rootSchema!: Schema;

  /** Current schema being visited */
  protected currentSchema!: Schema;

  /** Source of current node (direct, redefine, override, include, import) */
  protected source: NodeSource = 'direct';

  /** Depth in schema hierarchy (0 = root) */
  protected depth = 0;

  /** Traversal options */
  protected options: Required<TraverseOptions> = {
    includeImports: true,
    includeIncludes: true,
    maxDepth: Infinity,
  };

  /** Visited schemas (prevents infinite loops) */
  private visited = new Set<Schema>();

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Traverse a schema and all its imports/includes.
   * Override `on*` methods to handle specific node types.
   */
  traverse(schema: Schema, options: TraverseOptions = {}): this {
    this.rootSchema = schema;
    this.options = { ...this.options, ...options };
    this.visited.clear();
    this.traverseSchema(schema, 'direct', 0);
    return this;
  }

  // -------------------------------------------------------------------------
  // Override these methods in subclasses
  // -------------------------------------------------------------------------

  /** Called when entering a schema */
  protected onEnterSchema(_schema: Schema): void {
    /* override in subclass */
  }

  /** Called when leaving a schema */
  protected onLeaveSchema(_schema: Schema): void {
    /* override in subclass */
  }

  /** Called for each top-level complexType */
  protected onComplexType(_ct: TopLevelComplexType): void {
    /* override in subclass */
  }

  /** Called for each top-level simpleType */
  protected onSimpleType(_st: TopLevelSimpleType): void {
    /* override in subclass */
  }

  /** Called for each top-level element */
  protected onElement(_element: TopLevelElement): void {
    /* override in subclass */
  }

  /** Called for each top-level attribute */
  protected onAttribute(_attr: TopLevelAttribute): void {
    /* override in subclass */
  }

  /** Called for each named group */
  protected onGroup(_group: NamedGroup): void {
    /* override in subclass */
  }

  /** Called for each named attributeGroup */
  protected onAttributeGroup(_group: NamedAttributeGroup): void {
    /* override in subclass */
  }

  /** Called for each redefine block */
  protected onRedefine(_redefine: Redefine): void {
    /* override in subclass */
  }

  /** Called for each override block */
  protected onOverride(_override: Override): void {
    /* override in subclass */
  }

  // -------------------------------------------------------------------------
  // Internal traversal logic
  // -------------------------------------------------------------------------

  private traverseSchema(
    schema: Schema,
    source: NodeSource,
    depth: number,
  ): void {
    if (this.visited.has(schema)) return;
    if (depth > this.options.maxDepth) return;

    this.visited.add(schema);
    this.currentSchema = schema;
    this.source = source;
    this.depth = depth;

    this.onEnterSchema(schema);
    this.traverseSchemaChildren(schema);
    this.traverseRedefines(schema);
    this.traverseOverrides(schema);
    this.traverseIncludes(schema, depth);
    this.traverseImports(schema, depth);
    this.onLeaveSchema(schema);
  }

  private traverseSchemaChildren(schema: Schema): void {
    // ComplexTypes
    if (schema.complexType) {
      for (const ct of schema.complexType) {
        this.onComplexType(ct);
      }
    }

    // SimpleTypes
    if (schema.simpleType) {
      for (const st of schema.simpleType) {
        this.onSimpleType(st);
      }
    }

    // Elements
    if (schema.element) {
      for (const element of schema.element) {
        this.onElement(element);
      }
    }

    // Attributes
    if (schema.attribute) {
      for (const attr of schema.attribute) {
        this.onAttribute(attr);
      }
    }

    // Groups
    if (schema.group) {
      for (const group of schema.group) {
        this.onGroup(group);
      }
    }

    // AttributeGroups
    if (schema.attributeGroup) {
      for (const group of schema.attributeGroup) {
        this.onAttributeGroup(group);
      }
    }
  }

  private traverseRedefines(schema: Schema): void {
    if (!schema.redefine) return;

    const prevSource = this.source;
    this.source = 'redefine';

    for (const redefine of schema.redefine) {
      this.onRedefine(redefine);

      if (redefine.complexType) {
        for (const ct of redefine.complexType) {
          this.onComplexType(ct);
        }
      }
      if (redefine.simpleType) {
        for (const st of redefine.simpleType) {
          this.onSimpleType(st);
        }
      }
      if (redefine.group) {
        for (const group of redefine.group) {
          this.onGroup(group);
        }
      }
      if (redefine.attributeGroup) {
        for (const group of redefine.attributeGroup) {
          this.onAttributeGroup(group);
        }
      }
    }

    this.source = prevSource;
  }

  private traverseOverrides(schema: Schema): void {
    if (!schema.override) return;

    const prevSource = this.source;
    this.source = 'override';

    for (const override of schema.override) {
      this.onOverride(override);

      if (override.complexType) {
        for (const ct of override.complexType) {
          this.onComplexType(ct);
        }
      }
      if (override.simpleType) {
        for (const st of override.simpleType) {
          this.onSimpleType(st);
        }
      }
      if (override.element) {
        for (const element of override.element) {
          this.onElement(element);
        }
      }
      if (override.attribute) {
        for (const attr of override.attribute) {
          this.onAttribute(attr);
        }
      }
      if (override.group) {
        for (const group of override.group) {
          this.onGroup(group);
        }
      }
      if (override.attributeGroup) {
        for (const group of override.attributeGroup) {
          this.onAttributeGroup(group);
        }
      }
    }

    this.source = prevSource;
  }

  private traverseIncludes(schema: Schema, depth: number): void {
    if (!this.options.includeIncludes || !schema.$includes) return;

    for (const included of schema.$includes) {
      this.traverseSchema(included, 'include', depth + 1);
    }
  }

  private traverseImports(schema: Schema, depth: number): void {
    if (!this.options.includeImports || !schema.$imports) return;

    for (const imported of schema.$imports) {
      this.traverseSchema(imported, 'import', depth + 1);
    }
  }
}

// =============================================================================
// Built-in Traversers
// =============================================================================

/** Result of schema resolution */
export interface ResolvedSchema {
  readonly complexTypes: Map<
    string,
    { ct: TopLevelComplexType; schema: Schema }
  >;
  readonly simpleTypes: Map<string, { st: TopLevelSimpleType; schema: Schema }>;
  readonly elements: Map<string, { element: TopLevelElement; schema: Schema }>;
  readonly attributes: Map<string, { attr: TopLevelAttribute; schema: Schema }>;
  readonly groups: Map<string, { group: NamedGroup; schema: Schema }>;
  readonly attributeGroups: Map<
    string,
    { group: NamedAttributeGroup; schema: Schema }
  >;
  readonly xmlns: Map<string, string>;
  readonly substitutionGroups: Map<string, TopLevelElement[]>;
}

/**
 * Resolves a schema hierarchy into a flat structure.
 * All types are collected into Maps for O(1) lookup.
 *
 * Precedence rules:
 * - redefine/override types take precedence over original
 * - root schema types take precedence over imported/included
 */
export class SchemaResolver extends SchemaTraverser {
  readonly complexTypes = new Map<
    string,
    { ct: TopLevelComplexType; schema: Schema }
  >();
  readonly simpleTypes = new Map<
    string,
    { st: TopLevelSimpleType; schema: Schema }
  >();
  readonly elements = new Map<
    string,
    { element: TopLevelElement; schema: Schema }
  >();
  readonly attributes = new Map<
    string,
    { attr: TopLevelAttribute; schema: Schema }
  >();
  readonly groups = new Map<string, { group: NamedGroup; schema: Schema }>();
  readonly attributeGroups = new Map<
    string,
    { group: NamedAttributeGroup; schema: Schema }
  >();
  readonly xmlns = new Map<string, string>();
  readonly substitutionGroups = new Map<string, TopLevelElement[]>();

  /** Get the resolved schema structure */
  getResolved(): ResolvedSchema {
    return {
      complexTypes: this.complexTypes,
      simpleTypes: this.simpleTypes,
      elements: this.elements,
      attributes: this.attributes,
      groups: this.groups,
      attributeGroups: this.attributeGroups,
      xmlns: this.xmlns,
      substitutionGroups: this.substitutionGroups,
    };
  }

  protected override onEnterSchema(schema: Schema): void {
    // Collect xmlns
    if (schema.$xmlns) {
      for (const [prefix, uri] of Object.entries(schema.$xmlns)) {
        if (!this.xmlns.has(prefix)) {
          this.xmlns.set(prefix, uri);
        }
      }
    }
  }

  protected override onComplexType(ct: TopLevelComplexType): void {
    const shouldReplace =
      !this.complexTypes.has(ct.name) ||
      this.source === 'redefine' ||
      this.source === 'override' ||
      (this.depth === 0 && this.source === 'direct');

    if (shouldReplace) {
      this.complexTypes.set(ct.name, { ct, schema: this.currentSchema });
    }
  }

  protected override onSimpleType(st: TopLevelSimpleType): void {
    const shouldReplace =
      !this.simpleTypes.has(st.name) ||
      this.source === 'redefine' ||
      this.source === 'override' ||
      (this.depth === 0 && this.source === 'direct');

    if (shouldReplace) {
      this.simpleTypes.set(st.name, { st, schema: this.currentSchema });
    }
  }

  protected override onElement(element: TopLevelElement): void {
    const shouldReplace =
      !this.elements.has(element.name) ||
      this.source === 'override' ||
      (this.depth === 0 && this.source === 'direct');

    if (shouldReplace) {
      this.elements.set(element.name, { element, schema: this.currentSchema });
    }

    // Track substitution groups
    if (element.substitutionGroup) {
      const abstractName = stripNsPrefix(element.substitutionGroup);
      const existing = this.substitutionGroups.get(abstractName) ?? [];
      existing.push(element);
      this.substitutionGroups.set(abstractName, existing);
    }
  }

  protected override onAttribute(attr: TopLevelAttribute): void {
    const shouldReplace =
      !this.attributes.has(attr.name) ||
      this.source === 'override' ||
      (this.depth === 0 && this.source === 'direct');

    if (shouldReplace) {
      this.attributes.set(attr.name, { attr, schema: this.currentSchema });
    }
  }

  protected override onGroup(group: NamedGroup): void {
    const shouldReplace =
      !this.groups.has(group.name) ||
      this.source === 'redefine' ||
      this.source === 'override' ||
      (this.depth === 0 && this.source === 'direct');

    if (shouldReplace) {
      this.groups.set(group.name, { group, schema: this.currentSchema });
    }
  }

  protected override onAttributeGroup(group: NamedAttributeGroup): void {
    const shouldReplace =
      !this.attributeGroups.has(group.name) ||
      this.source === 'redefine' ||
      this.source === 'override' ||
      (this.depth === 0 && this.source === 'direct');

    if (shouldReplace) {
      this.attributeGroups.set(group.name, {
        group,
        schema: this.currentSchema,
      });
    }
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Strip namespace prefix from a QName (e.g., "xs:string" -> "string")
 */
export function stripNsPrefix(qname: string): string {
  const colonIndex = qname.indexOf(':');
  return colonIndex >= 0 ? qname.slice(colonIndex + 1) : qname;
}

/**
 * Resolve a schema hierarchy into a flat structure.
 * Convenience function that creates a SchemaResolver and returns the result.
 */
export function resolveSchemaTypes(
  schema: Schema,
  options: TraverseOptions = {},
): ResolvedSchema {
  const resolver = new SchemaResolver();
  resolver.traverse(schema, options);
  return resolver.getResolved();
}

/**
 * Find a complexType by name in a schema hierarchy.
 */
export function findComplexType(
  name: string,
  schema: Schema,
  options: TraverseOptions = {},
): { ct: TopLevelComplexType; schema: Schema } | undefined {
  const resolved = resolveSchemaTypes(schema, options);
  return resolved.complexTypes.get(name);
}

/**
 * Find a simpleType by name in a schema hierarchy.
 */
export function findSimpleType(
  name: string,
  schema: Schema,
  options: TraverseOptions = {},
): { st: TopLevelSimpleType; schema: Schema } | undefined {
  const resolved = resolveSchemaTypes(schema, options);
  return resolved.simpleTypes.get(name);
}

/**
 * Find an element by name in a schema hierarchy.
 */
export function findElement(
  name: string,
  schema: Schema,
  options: TraverseOptions = {},
): { element: TopLevelElement; schema: Schema } | undefined {
  const resolved = resolveSchemaTypes(schema, options);
  return resolved.elements.get(name);
}

/**
 * Get all substitutes for an abstract element.
 */
export function getSubstitutes(
  abstractElementName: string,
  schema: Schema,
  options: TraverseOptions = {},
): TopLevelElement[] {
  const resolved = resolveSchemaTypes(schema, options);
  return resolved.substitutionGroups.get(abstractElementName) ?? [];
}
