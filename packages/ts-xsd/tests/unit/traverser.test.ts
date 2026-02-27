/**
 * Schema Traverser Tests
 *
 * Tests for the OO traverser pattern using real W3C XSD types.
 */

import { describe, test as it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  SchemaTraverser,
  SchemaResolver,
  resolveSchemaTypes,
} from '../../src/xsd/traverser';
import type {
  Schema,
  TopLevelComplexType,
  TopLevelSimpleType,
  TopLevelElement,
  TopLevelAttribute,
  NamedGroup,
  NamedAttributeGroup,
} from '../../src/xsd/types';

// =============================================================================
// Test Fixtures
// =============================================================================

const baseSchema: Schema = {
  targetNamespace: 'http://example.com/base',
  $xmlns: { xs: 'http://www.w3.org/2001/XMLSchema' },
  complexType: [{ name: 'BaseType' }],
  simpleType: [{ name: 'BaseSimpleType', restriction: { base: 'xs:string' } }],
};

const mainSchema: Schema = {
  targetNamespace: 'http://example.com',
  $xmlns: {
    xs: 'http://www.w3.org/2001/XMLSchema',
    base: 'http://example.com/base',
  },
  $imports: [baseSchema],
  complexType: [{ name: 'PersonType' }, { name: 'AddressType' }],
  simpleType: [{ name: 'PhoneType', restriction: { base: 'xs:string' } }],
  element: [
    { name: 'person', type: 'PersonType' },
    { name: 'address', type: 'AddressType' },
  ],
  group: [{ name: 'ContactGroup', sequence: { element: [{ name: 'phone' }] } }],
  attributeGroup: [
    { name: 'CommonAttrs', attribute: [{ name: 'id', type: 'xs:string' }] },
  ],
};

const schemaWithRedefine: Schema = {
  targetNamespace: 'http://example.com',
  complexType: [{ name: 'OriginalType' }],
  redefine: [
    {
      schemaLocation: 'base.xsd',
      complexType: [{ name: 'RedefinedType' }],
      simpleType: [
        { name: 'RedefinedSimple', restriction: { base: 'xs:string' } },
      ],
    },
  ],
};

const schemaWithOverride: Schema = {
  targetNamespace: 'http://example.com',
  complexType: [{ name: 'OriginalType' }],
  override: [
    {
      schemaLocation: 'base.xsd',
      complexType: [{ name: 'OverriddenType' }],
      element: [{ name: 'overriddenElement', type: 'xs:string' }],
    },
  ],
};

const schemaWithIncludes: Schema = {
  targetNamespace: 'http://example.com',
  $includes: [
    {
      targetNamespace: 'http://example.com',
      complexType: [{ name: 'IncludedType' }],
    } as Schema,
  ],
  complexType: [{ name: 'MainType' }],
};

const schemaWithSubstitution: Schema = {
  targetNamespace: 'http://example.com',
  element: [
    { name: 'abstractElement', abstract: true, type: 'xs:anyType' },
    {
      name: 'concreteElement1',
      substitutionGroup: 'abstractElement',
      type: 'xs:string',
    },
    {
      name: 'concreteElement2',
      substitutionGroup: 'abstractElement',
      type: 'xs:int',
    },
  ],
};

// =============================================================================
// Custom Traverser for Testing
// =============================================================================

class TestCollector extends SchemaTraverser {
  readonly complexTypes: string[] = [];
  readonly simpleTypes: string[] = [];
  readonly elements: string[] = [];
  readonly groups: string[] = [];
  readonly attributeGroups: string[] = [];
  readonly schemas: string[] = [];

  protected override onEnterSchema(schema: Schema): void {
    this.schemas.push(schema.targetNamespace ?? 'unknown');
  }

  protected override onComplexType(ct: TopLevelComplexType): void {
    this.complexTypes.push(ct.name);
  }

  protected override onSimpleType(st: TopLevelSimpleType): void {
    this.simpleTypes.push(st.name);
  }

  protected override onElement(element: TopLevelElement): void {
    this.elements.push(element.name);
  }

  protected override onGroup(group: NamedGroup): void {
    this.groups.push(group.name);
  }

  protected override onAttributeGroup(group: NamedAttributeGroup): void {
    this.attributeGroups.push(group.name);
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('SchemaTraverser', () => {
  describe('basic traversal', () => {
    it('visits all complexTypes in a schema', () => {
      const collector = new TestCollector();
      collector.traverse(mainSchema);

      assert.deepEqual(collector.complexTypes.sort(), [
        'AddressType',
        'BaseType',
        'PersonType',
      ]);
    });

    it('visits all simpleTypes in a schema', () => {
      const collector = new TestCollector();
      collector.traverse(mainSchema);

      assert.deepEqual(collector.simpleTypes.sort(), [
        'BaseSimpleType',
        'PhoneType',
      ]);
    });

    it('visits all elements in a schema', () => {
      const collector = new TestCollector();
      collector.traverse(mainSchema);

      assert.deepEqual(collector.elements.sort(), ['address', 'person']);
    });

    it('visits all groups in a schema', () => {
      const collector = new TestCollector();
      collector.traverse(mainSchema);

      assert.deepEqual(collector.groups, ['ContactGroup']);
    });

    it('visits all attributeGroups in a schema', () => {
      const collector = new TestCollector();
      collector.traverse(mainSchema);

      assert.deepEqual(collector.attributeGroups, ['CommonAttrs']);
    });
  });

  describe('redefine handling', () => {
    it('visits complexTypes from redefine blocks', () => {
      const collector = new TestCollector();
      collector.traverse(schemaWithRedefine);

      assert.ok(collector.complexTypes.includes('OriginalType'));
      assert.ok(collector.complexTypes.includes('RedefinedType'));
    });

    it('visits simpleTypes from redefine blocks', () => {
      const collector = new TestCollector();
      collector.traverse(schemaWithRedefine);

      assert.ok(collector.simpleTypes.includes('RedefinedSimple'));
    });
  });

  describe('override handling', () => {
    it('visits complexTypes from override blocks', () => {
      const collector = new TestCollector();
      collector.traverse(schemaWithOverride);

      assert.ok(collector.complexTypes.includes('OriginalType'));
      assert.ok(collector.complexTypes.includes('OverriddenType'));
    });

    it('visits elements from override blocks', () => {
      const collector = new TestCollector();
      collector.traverse(schemaWithOverride);

      assert.ok(collector.elements.includes('overriddenElement'));
    });
  });

  describe('import handling', () => {
    it('traverses $imports by default', () => {
      const collector = new TestCollector();
      collector.traverse(mainSchema);

      // Should include types from imported schema
      assert.ok(collector.complexTypes.includes('BaseType'));
      assert.ok(collector.simpleTypes.includes('BaseSimpleType'));
    });

    it('can skip $imports with includeImports: false', () => {
      const collector = new TestCollector();
      collector.traverse(mainSchema, { includeImports: false });

      // Should NOT include types from imported schema
      assert.ok(!collector.complexTypes.includes('BaseType'));
      assert.ok(!collector.simpleTypes.includes('BaseSimpleType'));

      // Should still include main schema types
      assert.ok(collector.complexTypes.includes('PersonType'));
    });
  });

  describe('include handling', () => {
    it('traverses $includes by default', () => {
      const collector = new TestCollector();
      collector.traverse(schemaWithIncludes);

      assert.ok(collector.complexTypes.includes('MainType'));
      assert.ok(collector.complexTypes.includes('IncludedType'));
    });

    it('can skip $includes with includeIncludes: false', () => {
      const collector = new TestCollector();
      collector.traverse(schemaWithIncludes, { includeIncludes: false });

      assert.ok(collector.complexTypes.includes('MainType'));
      assert.ok(!collector.complexTypes.includes('IncludedType'));
    });
  });

  describe('circular reference handling', () => {
    it('handles circular schema references without infinite loop', () => {
      // Create circular reference
      const schemaA: Schema = {
        targetNamespace: 'http://example.com/a',
        complexType: [{ name: 'TypeA' }],
      };
      const schemaB: Schema = {
        targetNamespace: 'http://example.com/b',
        complexType: [{ name: 'TypeB' }],
        $imports: [schemaA],
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (schemaA as any).$imports = [schemaB];

      const collector = new TestCollector();
      collector.traverse(schemaA);

      // Should visit both without infinite loop
      assert.ok(collector.complexTypes.includes('TypeA'));
      assert.ok(collector.complexTypes.includes('TypeB'));
    });
  });

  describe('depth limiting', () => {
    it('respects maxDepth option', () => {
      const collector = new TestCollector();
      collector.traverse(mainSchema, { maxDepth: 0 });

      // Should only visit root schema, not imports
      assert.ok(collector.complexTypes.includes('PersonType'));
      assert.ok(!collector.complexTypes.includes('BaseType'));
    });
  });
});

describe('SchemaResolver', () => {
  it('collects all types into Maps', () => {
    const resolver = new SchemaResolver();
    resolver.traverse(mainSchema);

    assert.ok(resolver.complexTypes.has('PersonType'));
    assert.ok(resolver.complexTypes.has('AddressType'));
    assert.ok(resolver.complexTypes.has('BaseType'));

    assert.ok(resolver.simpleTypes.has('PhoneType'));
    assert.ok(resolver.simpleTypes.has('BaseSimpleType'));

    assert.ok(resolver.elements.has('person'));
    assert.ok(resolver.elements.has('address'));

    assert.ok(resolver.groups.has('ContactGroup'));
    assert.ok(resolver.attributeGroups.has('CommonAttrs'));
  });

  it('tracks substitution groups', () => {
    const resolver = new SchemaResolver();
    resolver.traverse(schemaWithSubstitution);

    const substitutes = resolver.substitutionGroups.get('abstractElement');
    assert.ok(substitutes);
    assert.equal(substitutes.length, 2);

    const names = substitutes.map((e) => e.name);
    assert.ok(names.includes('concreteElement1'));
    assert.ok(names.includes('concreteElement2'));
  });

  it('collects xmlns declarations', () => {
    const resolver = new SchemaResolver();
    resolver.traverse(mainSchema);

    assert.equal(resolver.xmlns.get('xs'), 'http://www.w3.org/2001/XMLSchema');
    assert.equal(resolver.xmlns.get('base'), 'http://example.com/base');
  });

  it('returns resolved schema via getResolved()', () => {
    const resolver = new SchemaResolver();
    resolver.traverse(mainSchema);
    const resolved = resolver.getResolved();

    assert.ok(resolved.complexTypes instanceof Map);
    assert.ok(resolved.simpleTypes instanceof Map);
    assert.ok(resolved.elements instanceof Map);
    assert.ok(resolved.groups instanceof Map);
    assert.ok(resolved.attributeGroups instanceof Map);
    assert.ok(resolved.xmlns instanceof Map);
    assert.ok(resolved.substitutionGroups instanceof Map);
  });
});

describe('resolveSchemaTypes', () => {
  it('is a convenience function for SchemaResolver', () => {
    const resolved = resolveSchemaTypes(mainSchema);

    assert.ok(resolved.complexTypes.has('PersonType'));
    assert.ok(resolved.simpleTypes.has('PhoneType'));
    assert.ok(resolved.elements.has('person'));
  });

  it('respects options', () => {
    const resolved = resolveSchemaTypes(mainSchema, { includeImports: false });

    assert.ok(resolved.complexTypes.has('PersonType'));
    assert.ok(!resolved.complexTypes.has('BaseType'));
  });
});

describe('context access in traverser', () => {
  it('provides access to currentSchema, source, and depth', () => {
    const contexts: Array<{ schema: string; source: string; depth: number }> =
      [];

    class ContextTracker extends SchemaTraverser {
      protected override onComplexType(_ct: TopLevelComplexType): void {
        contexts.push({
          schema: this.currentSchema.targetNamespace ?? 'unknown',
          source: this.source,
          depth: this.depth,
        });
      }
    }

    const tracker = new ContextTracker();
    tracker.traverse(mainSchema);

    // Main schema types should have depth 0, source 'direct'
    const mainTypes = contexts.filter((c) => c.schema === 'http://example.com');
    assert.ok(mainTypes.every((c) => c.depth === 0));
    assert.ok(mainTypes.every((c) => c.source === 'direct'));

    // Imported schema types should have depth 1, source 'import'
    const importedTypes = contexts.filter(
      (c) => c.schema === 'http://example.com/base',
    );
    assert.ok(importedTypes.every((c) => c.depth === 1));
    assert.ok(importedTypes.every((c) => c.source === 'import'));
  });
});

describe('SchemaTraverser additional coverage', () => {
  it('calls onLeaveSchema after processing', () => {
    const leaveOrder: string[] = [];

    class LeaveTracker extends SchemaTraverser {
      protected override onLeaveSchema(schema: Schema): void {
        leaveOrder.push(schema.targetNamespace ?? 'unknown');
      }
    }

    const tracker = new LeaveTracker();
    tracker.traverse(mainSchema);

    // Should have called onLeaveSchema for both schemas
    assert.ok(leaveOrder.includes('http://example.com'));
    assert.ok(leaveOrder.includes('http://example.com/base'));
  });

  it('visits top-level attributes', () => {
    const schemaWithAttrs: Schema = {
      targetNamespace: 'http://example.com',
      attribute: [
        { name: 'globalAttr1', type: 'xs:string' },
        { name: 'globalAttr2', type: 'xs:int' },
      ],
    };

    const attrs: string[] = [];

    class AttrCollector extends SchemaTraverser {
      protected override onAttribute(attr: TopLevelAttribute): void {
        attrs.push(attr.name);
      }
    }

    const collector = new AttrCollector();
    collector.traverse(schemaWithAttrs);

    assert.deepEqual(attrs.sort(), ['globalAttr1', 'globalAttr2']);
  });

  it('visits simpleTypes from redefine blocks', () => {
    const simpleTypes: string[] = [];

    class SimpleTypeCollector extends SchemaTraverser {
      protected override onSimpleType(st: TopLevelSimpleType): void {
        simpleTypes.push(st.name);
      }
    }

    const collector = new SimpleTypeCollector();
    collector.traverse(schemaWithRedefine);

    assert.ok(simpleTypes.includes('RedefinedSimple'));
  });

  it('visits groups from override blocks', () => {
    const schemaWithOverrideGroups: Schema = {
      targetNamespace: 'http://example.com',
      override: [
        {
          schemaLocation: 'base.xsd',
          group: [{ name: 'OverriddenGroup', sequence: { element: [] } }],
          attributeGroup: [{ name: 'OverriddenAttrGroup', attribute: [] }],
          simpleType: [
            { name: 'OverriddenSimple', restriction: { base: 'xs:string' } },
          ],
        },
      ],
    };

    const groups: string[] = [];
    const attrGroups: string[] = [];
    const simpleTypes: string[] = [];

    class OverrideCollector extends SchemaTraverser {
      protected override onGroup(group: NamedGroup): void {
        groups.push(group.name);
      }
      protected override onAttributeGroup(group: NamedAttributeGroup): void {
        attrGroups.push(group.name);
      }
      protected override onSimpleType(st: TopLevelSimpleType): void {
        simpleTypes.push(st.name);
      }
    }

    const collector = new OverrideCollector();
    collector.traverse(schemaWithOverrideGroups);

    assert.ok(groups.includes('OverriddenGroup'));
    assert.ok(attrGroups.includes('OverriddenAttrGroup'));
    assert.ok(simpleTypes.includes('OverriddenSimple'));
  });

  it('visits groups from redefine blocks', () => {
    const schemaWithRedefineGroups: Schema = {
      targetNamespace: 'http://example.com',
      redefine: [
        {
          schemaLocation: 'base.xsd',
          group: [{ name: 'RedefinedGroup', sequence: { element: [] } }],
          attributeGroup: [{ name: 'RedefinedAttrGroup', attribute: [] }],
        },
      ],
    };

    const groups: string[] = [];
    const attrGroups: string[] = [];

    class RedefineGroupCollector extends SchemaTraverser {
      protected override onGroup(group: NamedGroup): void {
        groups.push(group.name);
      }
      protected override onAttributeGroup(group: NamedAttributeGroup): void {
        attrGroups.push(group.name);
      }
    }

    const collector = new RedefineGroupCollector();
    collector.traverse(schemaWithRedefineGroups);

    assert.ok(groups.includes('RedefinedGroup'));
    assert.ok(attrGroups.includes('RedefinedAttrGroup'));
  });

  it('calls onRedefine callback', () => {
    const redefines: string[] = [];

    class RedefineTracker extends SchemaTraverser {
      protected override onRedefine(redefine: {
        schemaLocation?: string;
      }): void {
        redefines.push(redefine.schemaLocation ?? 'unknown');
      }
    }

    const tracker = new RedefineTracker();
    tracker.traverse(schemaWithRedefine);

    assert.ok(redefines.includes('base.xsd'));
  });

  it('calls onOverride callback', () => {
    const overrides: string[] = [];

    class OverrideTracker extends SchemaTraverser {
      protected override onOverride(override: {
        schemaLocation?: string;
      }): void {
        overrides.push(override.schemaLocation ?? 'unknown');
      }
    }

    const tracker = new OverrideTracker();
    tracker.traverse(schemaWithOverride);

    assert.ok(overrides.includes('base.xsd'));
  });

  it('returns this from traverse for chaining', () => {
    const collector = new TestCollector();
    const result = collector.traverse(mainSchema);

    assert.strictEqual(result, collector);
  });
});
