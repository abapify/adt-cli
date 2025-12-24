/**
 * Type inference tests for InferElement with multi-level $imports
 *
 * This tests the same pattern as adt-schemas/classes schema:
 * - AbapClass extends AbapOoObject (in abapoo)
 * - AbapOoObject extends AbapSourceMainObject (in abapsource)
 * - AbapSourceMainObject extends AdtMainObject (in adtcore)
 * - AdtMainObject extends AdtObject (in adtcore)
 *
 * NOTE: These are compile-time type tests. If this file compiles without errors,
 * the tests pass. The runtime tests are just placeholders.
 */
import { describe, test as it } from 'node:test';
import type {
  InferElement,
  InferSchema,
  FindByName,
  FindComplexTypeWithSchema,
} from '../../src/infer/infer';

// =============================================================================
// Layer 1: Base schema (like adtcore) - defined inline with as const
// =============================================================================
const baseSchema = {
  $xmlns: { base: 'http://example.com/base' },
  targetNamespace: 'http://example.com/base',
  complexType: [
    {
      name: 'BaseObject',
      attribute: [
        { name: 'id', type: 'xsd:string' },
        { name: 'name', type: 'xsd:string' },
      ],
    },
    {
      name: 'MainObject',
      complexContent: {
        extension: {
          base: 'BaseObject',
          sequence: {
            element: [
              {
                name: 'packageRef',
                type: 'base:PackageReference',
                minOccurs: '0',
                maxOccurs: '1',
              },
            ],
          },
          attribute: [
            { name: 'version', type: 'xsd:string' },
            { name: 'description', type: 'xsd:string' },
          ],
        },
      },
    },
    // Type referenced by nested element
    {
      name: 'PackageReference',
      attribute: [
        { name: 'uri', type: 'xsd:string' },
        { name: 'name', type: 'xsd:string' },
        { name: 'type', type: 'xsd:string' },
      ],
    },
    // Type for unbounded array elements (like AbapClassInclude)
    {
      name: 'IncludeItem',
      attribute: [
        { name: 'includeType', type: 'xsd:string' },
        { name: 'sourceUri', type: 'xsd:string' },
      ],
    },
  ],
} as const;

// =============================================================================
// Layer 2: Middle schema (like abapsource) - imports baseSchema
// Note: $imports array causes type widening, which is the real-world scenario
// =============================================================================
const middleSchema = {
  $xmlns: {
    base: 'http://example.com/base',
    middle: 'http://example.com/middle',
  },
  $imports: [baseSchema],
  targetNamespace: 'http://example.com/middle',
  complexType: [
    {
      name: 'SourceObject',
      complexContent: {
        extension: {
          base: 'base:MainObject',
          attribute: [
            { name: 'sourceUri', type: 'xsd:string' },
            { name: 'language', type: 'xsd:string' },
          ],
        },
      },
    },
  ],
} as const;

// =============================================================================
// Layer 3: Top schema (like classes) - imports both schemas
// This mimics the real-world pattern where imports cause type widening
// =============================================================================
const topSchema = {
  $xmlns: {
    base: 'http://example.com/base',
    middle: 'http://example.com/middle',
    top: 'http://example.com/top',
  },
  $imports: [baseSchema, middleSchema],
  targetNamespace: 'http://example.com/top',
  element: [
    { name: 'myClass', type: 'top:MyClass' },
    { name: 'myInclude', type: 'top:MyInclude' },
  ],
  complexType: [
    {
      name: 'MyClass',
      complexContent: {
        extension: {
          base: 'middle:SourceObject',
          sequence: {
            element: [
              {
                // Array of items with type from imported schema (like AbapClassInclude)
                name: 'include',
                type: 'base:IncludeItem',
                minOccurs: '0',
                maxOccurs: 'unbounded',
              },
            ],
          },
          attribute: [
            { name: 'final', type: 'xsd:boolean' },
            { name: 'abstract', type: 'xsd:boolean' },
            { name: 'visibility', type: 'xsd:string' },
          ],
        },
      },
    },
    {
      name: 'MyInclude',
      attribute: [{ name: 'includeType', type: 'xsd:string' }],
    },
  ],
} as const;

// =============================================================================
// Type Tests
// =============================================================================

describe('InferElement with multi-level $imports', () => {
  describe('FindByName', () => {
    it('should find element in tuple array', () => {
      type Found = FindByName<(typeof topSchema)['element'], 'myClass'>;
      // Should find the element (returns item type for widened arrays)
      type IsNever = [Found] extends [never] ? true : false;
      const _check: IsNever = false; // compile error if Found is never
    });

    it('should find element by name in widened array', () => {
      // Simulate widened array (like when imports cause widening)
      const _widenedElements: readonly { name: string; type: string }[] =
        topSchema.element;
      type Found = FindByName<typeof _widenedElements, 'myClass'>;
      // Should still find (returns the item type)
      type IsNever = [Found] extends [never] ? true : false;
      const _check: IsNever = false;
    });
  });

  describe('FindComplexTypeWithSchema', () => {
    it('should find type in current schema', () => {
      type Found = FindComplexTypeWithSchema<'MyClass', typeof topSchema>;
      type IsNever = [Found] extends [never] ? true : false;
      const _check: IsNever = false;
    });

    it('should find type in $imports (1 level deep)', () => {
      type Found = FindComplexTypeWithSchema<'SourceObject', typeof topSchema>;
      // Note: With widened $imports, this returns the item type from the widened array
      type IsNever = [Found] extends [never] ? true : false;
      const _check: IsNever = false;
    });

    it('should find type in $imports (2 levels deep)', () => {
      type Found = FindComplexTypeWithSchema<'MainObject', typeof topSchema>;
      type IsNever = [Found] extends [never] ? true : false;
      const _check: IsNever = false;
    });

    it('should find base type in $imports (2 levels deep)', () => {
      type Found = FindComplexTypeWithSchema<'BaseObject', typeof topSchema>;
      type IsNever = [Found] extends [never] ? true : false;
      const _check: IsNever = false;
    });
  });

  describe('InferElement', () => {
    it('should infer element type', () => {
      type MyClass = InferElement<typeof topSchema, 'myClass'>;
      type IsNever = [MyClass] extends [never] ? true : false;
      const _check: IsNever = false;
    });

    it('should have own attributes', () => {
      type MyClass = InferElement<typeof topSchema, 'myClass'>;
      // Own attributes from MyClass
      type HasFinal = MyClass extends { final?: unknown } ? true : false;
      type HasAbstract = MyClass extends { abstract?: unknown } ? true : false;
      type HasVisibility = MyClass extends { visibility?: unknown }
        ? true
        : false;
      const _f: HasFinal = true;
      const _a: HasAbstract = true;
      const _v: HasVisibility = true;
    });

    it('should have inherited attributes from middle layer', () => {
      type MyClass = InferElement<typeof topSchema, 'myClass'>;
      // Inherited from SourceObject (middle layer)
      type HasSourceUri = MyClass extends { sourceUri?: unknown }
        ? true
        : false;
      type HasLanguage = MyClass extends { language?: unknown } ? true : false;
      const _s: HasSourceUri = true;
      const _l: HasLanguage = true;
    });

    it('should have inherited attributes from base layer', () => {
      type MyClass = InferElement<typeof topSchema, 'myClass'>;
      // Inherited from MainObject (base layer)
      type HasVersion = MyClass extends { version?: unknown } ? true : false;
      type HasDescription = MyClass extends { description?: unknown }
        ? true
        : false;
      // Inherited from BaseObject (base layer)
      type HasId = MyClass extends { id?: unknown } ? true : false;
      type HasName = MyClass extends { name?: unknown } ? true : false;
      const _ver: HasVersion = true;
      const _desc: HasDescription = true;
      const _id: HasId = true;
      const _name: HasName = true;
    });

    it('should infer simple element without inheritance', () => {
      type MyInclude = InferElement<typeof topSchema, 'myInclude'>;
      type IsNever = [MyInclude] extends [never] ? true : false;
      type HasIncludeType = MyInclude extends { includeType?: unknown }
        ? true
        : false;
      const _check: IsNever = false;
      const _inc: HasIncludeType = true;
    });

    it('should infer nested element type from imported schema', () => {
      type MyClass = InferElement<typeof topSchema, 'myClass'>;
      // packageRef is inherited from MainObject (in baseSchema)
      // Its type is base:PackageReference which should resolve to { uri?, name?, type? }
      type HasPackageRef = MyClass extends { packageRef?: unknown }
        ? true
        : false;
      const _hasRef: HasPackageRef = true;

      // The packageRef should have the PackageReference type's attributes
      type PackageRefType = MyClass extends { packageRef?: infer P }
        ? P
        : never;
      type PackageRefHasName = PackageRefType extends { name?: unknown }
        ? true
        : false;
      type PackageRefHasUri = PackageRefType extends { uri?: unknown }
        ? true
        : false;
      type PackageRefHasType = PackageRefType extends { type?: unknown }
        ? true
        : false;
      const _refHasName: PackageRefHasName = true;
      const _refHasUri: PackageRefHasUri = true;
      const _refHasType: PackageRefHasType = true;
    });

    it('should infer unbounded array element type from imported schema', () => {
      type MyClass = InferElement<typeof topSchema, 'myClass'>;
      // include is an array (maxOccurs: unbounded) of IncludeItem from baseSchema
      type HasInclude = MyClass extends { include?: unknown } ? true : false;
      const _hasInclude: HasInclude = true;

      // include should be an array
      type IncludeType = MyClass extends { include?: infer I } ? I : never;
      type IncludeIsArray = IncludeType extends unknown[] ? true : false;
      const _includeIsArray: IncludeIsArray = true;

      // Array elements should have IncludeItem's attributes
      type IncludeItemType = IncludeType extends (infer Item)[] ? Item : never;
      type IncludeItemHasIncludeType = IncludeItemType extends {
        includeType?: unknown;
      }
        ? true
        : false;
      type IncludeItemHasSourceUri = IncludeItemType extends {
        sourceUri?: unknown;
      }
        ? true
        : false;
      const _itemHasIncludeType: IncludeItemHasIncludeType = true;
      const _itemHasSourceUri: IncludeItemHasSourceUri = true;
    });
  });

  describe('InferSchema', () => {
    it('should infer union of all root elements', () => {
      type Schema = InferSchema<typeof topSchema>;
      type IsNever = [Schema] extends [never] ? true : false;
      const _check: IsNever = false;
    });
  });

  describe('Deep inheritance (4+ levels)', () => {
    // Reproduces "Type instantiation is excessively deep" error
    // This mimics real-world schemas like classes -> abapoo -> abapsource -> adtcore

    const l1 = {
      $xmlns: { l1: 'http://l1' },
      targetNamespace: 'http://l1',
      complexType: [
        { name: 'Base', attribute: [{ name: 'id', type: 'xsd:string' }] },
        { name: 'Ref', attribute: [{ name: 'uri', type: 'xsd:string' }] },
        {
          name: 'L1Obj',
          complexContent: {
            extension: {
              base: 'Base',
              sequence: {
                element: [{ name: 'ref', type: 'l1:Ref', minOccurs: '0' }],
              },
            },
          },
        },
      ],
    } as const;

    const l2 = {
      $xmlns: { l1: 'http://l1', l2: 'http://l2' },
      $imports: [l1],
      targetNamespace: 'http://l2',
      complexType: [
        {
          name: 'L2Obj',
          complexContent: {
            extension: {
              base: 'l1:L1Obj',
              attribute: [{ name: 'l2a', type: 'xsd:string' }],
            },
          },
        },
      ],
    } as const;

    const l3 = {
      $xmlns: { l1: 'http://l1', l2: 'http://l2', l3: 'http://l3' },
      $imports: [l1, l2],
      targetNamespace: 'http://l3',
      complexType: [
        { name: 'Item', attribute: [{ name: 'itemType', type: 'xsd:string' }] },
        {
          name: 'L3Obj',
          complexContent: {
            extension: {
              base: 'l2:L2Obj',
              sequence: {
                element: [
                  {
                    name: 'items',
                    type: 'l3:Item',
                    minOccurs: '0',
                    maxOccurs: 'unbounded',
                  },
                ],
              },
            },
          },
        },
      ],
    } as const;

    const _l4 = {
      $xmlns: {
        l1: 'http://l1',
        l2: 'http://l2',
        l3: 'http://l3',
        l4: 'http://l4',
      },
      $imports: [l1, l2, l3],
      targetNamespace: 'http://l4',
      element: [{ name: 'obj', type: 'l4:L4Obj' }],
      complexType: [
        { name: 'L4Obj', complexContent: { extension: { base: 'l3:L3Obj' } } },
      ],
    } as const;

    it('should infer element with 4 levels of inheritance', () => {
      type Obj = InferElement<typeof _l4, 'obj'>;
      type IsNever = [Obj] extends [never] ? true : false;
      const _check: IsNever = false;

      // Should have inherited properties
      type HasId = Obj extends { id?: unknown } ? true : false;
      type HasItems = Obj extends { items?: unknown } ? true : false;
      const _hasId: HasId = true;
      const _hasItems: HasItems = true;
    });

    it('should document recursion limit workaround for array access', () => {
      type Obj = InferElement<typeof _l4, 'obj'>;

      // KNOWN LIMITATION: Deep schema inheritance (4+ levels) causes TS2589
      // "Type instantiation is excessively deep and possibly infinite"
      // when accessing array element properties inline:
      //   data.items?.map((item) => item.itemType)  // ERROR!

      // WORKAROUND 1: Use 'unknown' type annotation with type guard
      function _testWithUnknown(data: Obj) {
        const types = data.items?.map((item: unknown) => {
          if (item && typeof item === 'object' && 'itemType' in item) {
            return (item as { itemType?: string }).itemType;
          }
          return undefined;
        });
        return types;
      }

      // WORKAROUND 2: Define interface manually based on schema
      interface ItemType {
        itemType?: string;
      }
      function _testWithInterface(data: Obj) {
        const types = data.items?.map((item: ItemType) => item.itemType);
        return types;
      }

      // Type-level check that items is an array (this works)
      type ItemsType = Obj extends { items?: infer I } ? I : never;
      type ItemsIsArray = ItemsType extends unknown[] ? true : false;
      const _itemsIsArray: ItemsIsArray = true;
    });
  });
});

// =============================================================================
// Compile-time type assertions (these will fail tsc if types are wrong)
// =============================================================================

// Type-level tests that verify at compile time
type _MyClass = InferElement<typeof topSchema, 'myClass'>;
type _MyInclude = InferElement<typeof topSchema, 'myInclude'>;

// These should all be true at compile time
type _HasFinal = _MyClass extends { final?: unknown } ? true : false;
type _HasAbstract = _MyClass extends { abstract?: unknown } ? true : false;
type _HasSourceUri = _MyClass extends { sourceUri?: unknown } ? true : false;
type _HasVersion = _MyClass extends { version?: unknown } ? true : false;
type _HasId = _MyClass extends { id?: unknown } ? true : false;
type _HasIncludeType = _MyInclude extends { includeType?: unknown }
  ? true
  : false;

// Static assertions - these lines will cause compile errors if types are wrong
const _assertHasFinal: _HasFinal = true;
const _assertHasAbstract: _HasAbstract = true;
const _assertHasSourceUri: _HasSourceUri = true;
const _assertHasVersion: _HasVersion = true;
const _assertHasId: _HasId = true;
const _assertHasIncludeType: _HasIncludeType = true;
