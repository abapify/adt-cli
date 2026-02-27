/**
 * Unit tests for Schema Resolver
 *
 * Tests the resolveSchema function that merges imports and expands
 * substitution groups into a single self-contained schema.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveSchema, getSubstitutes } from '../../src/xsd/resolve.ts';
// Types imported for documentation purposes
// import type { Schema } from '../../src/xsd/types.ts';

describe('Schema Resolver', () => {
  describe('resolveSchema', () => {
    it('should merge types from $imports', () => {
      // Base schema with abstract element
      const asxSchema = {
        $filename: 'asx.xsd',
        targetNamespace: 'http://www.sap.com/abapxml',
        element: [{ name: 'Schema', abstract: true }],
        complexType: [
          {
            name: 'AbapValuesType',
            sequence: {
              element: [
                { ref: 'asx:Schema', minOccurs: '0', maxOccurs: 'unbounded' },
              ],
            },
          },
        ],
      };

      // Schema that imports asx and defines substitutes
      const domaSchema = {
        $filename: 'doma.xsd',
        targetNamespace: 'http://www.sap.com/doma',
        $imports: [asxSchema],
        element: [
          { name: 'DD01V', type: 'Dd01vType', substitutionGroup: 'asx:Schema' },
          {
            name: 'DD07V_TAB',
            type: 'Dd07vTabType',
            substitutionGroup: 'asx:Schema',
          },
        ],
        complexType: [
          {
            name: 'Dd01vType',
            sequence: { element: [{ name: 'DOMNAME', type: 'xs:string' }] },
          },
          {
            name: 'Dd07vTabType',
            sequence: { element: [{ name: 'DD07V', type: 'Dd07vType' }] },
          },
        ],
      };

      const resolved = resolveSchema(domaSchema);

      // Should have merged types from import
      const complexTypes = resolved.complexType as { name?: string }[];
      const typeNames = complexTypes.map((ct) => ct.name);

      assert.ok(typeNames.includes('Dd01vType'), 'Should have Dd01vType');
      assert.ok(typeNames.includes('Dd07vTabType'), 'Should have Dd07vTabType');
      assert.ok(
        typeNames.includes('AbapValuesType'),
        'Should have AbapValuesType from import',
      );

      // Should have merged elements
      const elements = resolved.element as { name?: string }[];
      const elementNames = elements.map((el) => el.name);

      assert.ok(elementNames.includes('DD01V'), 'Should have DD01V');
      assert.ok(elementNames.includes('DD07V_TAB'), 'Should have DD07V_TAB');
      assert.ok(
        elementNames.includes('Schema'),
        'Should have Schema from import',
      );
    });

    it('should expand substitution groups in complex types', () => {
      const asxSchema = {
        $filename: 'asx.xsd',
        element: [{ name: 'Schema', abstract: true }],
        complexType: [
          {
            name: 'AbapValuesType',
            sequence: {
              element: [
                { ref: 'asx:Schema', minOccurs: '0', maxOccurs: 'unbounded' },
              ],
            },
          },
        ],
      };

      const domaSchema = {
        $filename: 'doma.xsd',
        $imports: [asxSchema],
        element: [
          { name: 'DD01V', type: 'Dd01vType', substitutionGroup: 'asx:Schema' },
          {
            name: 'DD07V_TAB',
            type: 'Dd07vTabType',
            substitutionGroup: 'asx:Schema',
          },
        ],
        complexType: [{ name: 'Dd01vType' }, { name: 'Dd07vTabType' }],
      };

      const resolved = resolveSchema(domaSchema, { expandSubstitutions: true });

      // Find AbapValuesType
      const complexTypes = resolved.complexType as {
        name?: string;
        sequence?: { element?: { name?: string }[] };
      }[];
      const abapValuesType = complexTypes.find(
        (ct) => ct.name === 'AbapValuesType',
      );

      assert.ok(abapValuesType, 'Should have AbapValuesType');

      // The sequence should now have DD01V and DD07V_TAB instead of abstract Schema ref
      const elements = abapValuesType.sequence?.element ?? [];
      const elementNames = elements.map((el) => el.name);

      assert.ok(elementNames.includes('DD01V'), 'Should have DD01V element');
      assert.ok(
        elementNames.includes('DD07V_TAB'),
        'Should have DD07V_TAB element',
      );
    });

    it('should not include $imports in resolved schema by default', () => {
      const baseSchema = {
        $filename: 'base.xsd',
        complexType: [{ name: 'BaseType' }],
      };
      const mainSchema = {
        $filename: 'main.xsd',
        $imports: [baseSchema],
        complexType: [{ name: 'MainType' }],
      };

      const resolved = resolveSchema(mainSchema);

      assert.ok(!resolved.$imports, 'Should not have $imports by default');
    });

    it('should keep $imports reference when keepImportsRef is true', () => {
      const baseSchema = {
        $filename: 'base.xsd',
        complexType: [{ name: 'BaseType' }],
      };
      const mainSchema = {
        $filename: 'main.xsd',
        $imports: [baseSchema],
        complexType: [{ name: 'MainType' }],
      };

      const resolved = resolveSchema(mainSchema, { keepImportsRef: true });

      assert.ok(
        resolved.$imports,
        'Should have $imports when keepImportsRef is true',
      );
    });

    it('should expand complexContent/extension', () => {
      const schema = {
        $filename: 'test.xsd',
        complexType: [
          {
            name: 'BaseType',
            sequence: {
              element: [{ name: 'baseProp', type: 'xs:string' }],
            },
          },
          {
            name: 'DerivedType',
            complexContent: {
              extension: {
                base: 'BaseType',
                sequence: {
                  element: [{ name: 'derivedProp', type: 'xs:string' }],
                },
              },
            },
          },
        ],
      };

      const resolved = resolveSchema(schema, { expandExtensions: true });

      // Find DerivedType
      const complexTypes = resolved.complexType as {
        name?: string;
        all?: { element?: { name?: string }[] };
      }[];
      const derivedType = complexTypes.find((ct) => ct.name === 'DerivedType');

      assert.ok(derivedType, 'Should have DerivedType');

      // Should have merged elements from base and extension
      const elements = derivedType.all?.element ?? [];
      const elementNames = elements.map((el) => el.name);

      assert.ok(
        elementNames.includes('baseProp'),
        'Should have baseProp from base type',
      );
      assert.ok(
        elementNames.includes('derivedProp'),
        'Should have derivedProp from extension',
      );
    });

    it('should merge attributes from base type and extension', () => {
      const schema = {
        $filename: 'test.xsd',
        complexType: [
          {
            name: 'BaseType',
            attribute: [{ name: 'baseAttr', type: 'xs:string' }],
            sequence: {
              element: [{ name: 'baseProp', type: 'xs:string' }],
            },
          },
          {
            name: 'DerivedType',
            complexContent: {
              extension: {
                base: 'BaseType',
                attribute: [{ name: 'derivedAttr', type: 'xs:string' }],
                sequence: {
                  element: [{ name: 'derivedProp', type: 'xs:string' }],
                },
              },
            },
          },
        ],
      };

      const resolved = resolveSchema(schema, { expandExtensions: true });

      // Find DerivedType
      const complexTypes = resolved.complexType as {
        name?: string;
        attribute?: { name?: string }[];
      }[];
      const derivedType = complexTypes.find((ct) => ct.name === 'DerivedType');

      assert.ok(derivedType, 'Should have DerivedType');

      // Should have merged attributes from base and extension
      const attributes = derivedType.attribute ?? [];
      const attrNames = attributes.map((a) => a.name);

      assert.ok(
        attrNames.includes('baseAttr'),
        'Should have baseAttr from base type',
      );
      assert.ok(
        attrNames.includes('derivedAttr'),
        'Should have derivedAttr from extension',
      );
    });

    it('should handle extension without base type attributes', () => {
      const schema = {
        $filename: 'test.xsd',
        complexType: [
          {
            name: 'BaseType',
            // No attributes on base type
            sequence: {
              element: [{ name: 'baseProp', type: 'xs:string' }],
            },
          },
          {
            name: 'DerivedType',
            complexContent: {
              extension: {
                base: 'BaseType',
                attribute: [{ name: 'derivedAttr', type: 'xs:string' }],
              },
            },
          },
        ],
      };

      const resolved = resolveSchema(schema, { expandExtensions: true });

      const complexTypes = resolved.complexType as {
        name?: string;
        attribute?: { name?: string }[];
      }[];
      const derivedType = complexTypes.find((ct) => ct.name === 'DerivedType');

      assert.ok(derivedType, 'Should have DerivedType');

      const attributes = derivedType.attribute ?? [];
      assert.strictEqual(attributes.length, 1, 'Should have 1 attribute');
      assert.strictEqual(
        attributes[0].name,
        'derivedAttr',
        'Should have derivedAttr',
      );
    });

    it('should handle extension without extension attributes', () => {
      const schema = {
        $filename: 'test.xsd',
        complexType: [
          {
            name: 'BaseType',
            attribute: [{ name: 'baseAttr', type: 'xs:string' }],
            sequence: {
              element: [{ name: 'baseProp', type: 'xs:string' }],
            },
          },
          {
            name: 'DerivedType',
            complexContent: {
              extension: {
                base: 'BaseType',
                // No attributes on extension
                sequence: {
                  element: [{ name: 'derivedProp', type: 'xs:string' }],
                },
              },
            },
          },
        ],
      };

      const resolved = resolveSchema(schema, { expandExtensions: true });

      const complexTypes = resolved.complexType as {
        name?: string;
        attribute?: { name?: string }[];
      }[];
      const derivedType = complexTypes.find((ct) => ct.name === 'DerivedType');

      assert.ok(derivedType, 'Should have DerivedType');

      const attributes = derivedType.attribute ?? [];
      assert.strictEqual(attributes.length, 1, 'Should have 1 attribute');
      assert.strictEqual(
        attributes[0].name,
        'baseAttr',
        'Should have baseAttr from base',
      );
    });

    it('should expand substitution groups in all group', () => {
      const asxSchema = {
        $filename: 'asx.xsd',
        element: [{ name: 'Schema', abstract: true }],
        complexType: [
          {
            name: 'AbapValuesType',
            all: {
              // Using 'all' instead of 'sequence'
              element: [
                { ref: 'asx:Schema', minOccurs: '0', maxOccurs: 'unbounded' },
              ],
            },
          },
        ],
      };

      const domaSchema = {
        $filename: 'doma.xsd',
        $imports: [asxSchema],
        element: [
          { name: 'DD01V', type: 'Dd01vType', substitutionGroup: 'asx:Schema' },
        ],
        complexType: [{ name: 'Dd01vType' }],
      };

      const resolved = resolveSchema(domaSchema, { expandSubstitutions: true });

      const complexTypes = resolved.complexType as {
        name?: string;
        all?: { element?: { name?: string }[] };
      }[];
      const abapValuesType = complexTypes.find(
        (ct) => ct.name === 'AbapValuesType',
      );

      assert.ok(abapValuesType, 'Should have AbapValuesType');
      const elements = abapValuesType.all?.element ?? [];
      const elementNames = elements.map((el) => el.name);

      assert.ok(
        elementNames.includes('DD01V'),
        'Should have DD01V element in all group',
      );
    });

    it('should expand substitution groups in choice group', () => {
      const asxSchema = {
        $filename: 'asx.xsd',
        element: [{ name: 'Schema', abstract: true }],
        complexType: [
          {
            name: 'AbapValuesType',
            choice: {
              // Using 'choice' instead of 'sequence'
              element: [
                { ref: 'asx:Schema', minOccurs: '0', maxOccurs: 'unbounded' },
              ],
            },
          },
        ],
      };

      const domaSchema = {
        $filename: 'doma.xsd',
        $imports: [asxSchema],
        element: [
          { name: 'DD01V', type: 'Dd01vType', substitutionGroup: 'asx:Schema' },
        ],
        complexType: [{ name: 'Dd01vType' }],
      };

      const resolved = resolveSchema(domaSchema, { expandSubstitutions: true });

      const complexTypes = resolved.complexType as {
        name?: string;
        choice?: { element?: { name?: string }[] };
      }[];
      const abapValuesType = complexTypes.find(
        (ct) => ct.name === 'AbapValuesType',
      );

      assert.ok(abapValuesType, 'Should have AbapValuesType');
      const elements = abapValuesType.choice?.element ?? [];
      const elementNames = elements.map((el) => el.name);

      assert.ok(
        elementNames.includes('DD01V'),
        'Should have DD01V element in choice group',
      );
    });

    it('should work with resolveImports disabled', () => {
      const baseSchema = {
        $filename: 'base.xsd',
        complexType: [{ name: 'BaseType' }],
      };
      const mainSchema = {
        $filename: 'main.xsd',
        $imports: [baseSchema],
        complexType: [{ name: 'MainType' }],
      };

      const resolved = resolveSchema(mainSchema, { resolveImports: false });

      const complexTypes = resolved.complexType as { name?: string }[];
      const typeNames = complexTypes.map((ct) => ct.name);

      // Should only have MainType, not BaseType from import
      assert.ok(typeNames.includes('MainType'), 'Should have MainType');
      assert.ok(
        !typeNames.includes('BaseType'),
        'Should NOT have BaseType when resolveImports is false',
      );
    });
  });

  describe('getSubstitutes', () => {
    it('should find substitutes in current schema', () => {
      const schema = {
        element: [
          { name: 'Schema', abstract: true },
          { name: 'DD01V', type: 'Dd01vType', substitutionGroup: 'asx:Schema' },
          {
            name: 'DD07V_TAB',
            type: 'Dd07vTabType',
            substitutionGroup: 'asx:Schema',
          },
        ],
      };

      const substitutes = getSubstitutes('Schema', schema);

      assert.strictEqual(substitutes.length, 2, 'Should find 2 substitutes');
      assert.ok(
        substitutes.some((s) => s.name === 'DD01V'),
        'Should find DD01V',
      );
      assert.ok(
        substitutes.some((s) => s.name === 'DD07V_TAB'),
        'Should find DD07V_TAB',
      );
    });

    it('should find substitutes in $imports', () => {
      const importedSchema = {
        element: [
          { name: 'DD01V', type: 'Dd01vType', substitutionGroup: 'asx:Schema' },
        ],
      };

      const schema = {
        $imports: [importedSchema],
        element: [
          { name: 'Schema', abstract: true },
          {
            name: 'DD07V_TAB',
            type: 'Dd07vTabType',
            substitutionGroup: 'asx:Schema',
          },
        ],
      };

      const substitutes = getSubstitutes('Schema', schema);

      assert.strictEqual(
        substitutes.length,
        2,
        'Should find 2 substitutes (1 local + 1 imported)',
      );
    });
  });
});
