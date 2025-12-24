/**
 * Tests for codegen/ts-morph module
 *
 * Tests schema to ts-morph SourceFile conversion.
 */

import { describe, test as it } from 'node:test';
import { strict as assert } from 'node:assert';
import { schemaToSourceFile } from '../../src/codegen/ts-morph';
import {
  deriveRootTypeName,
  generateInterfaces,
} from '../../src/codegen/interface-generator';
import type { Schema } from '../../src/xsd/types';

describe('codegen/ts-morph', () => {
  describe('deriveRootTypeName', () => {
    it('derives name from filename with .xsd extension', () => {
      assert.equal(deriveRootTypeName('discovery.xsd'), 'DiscoverySchema');
    });

    it('derives name from filename without extension', () => {
      assert.equal(deriveRootTypeName('discovery'), 'DiscoverySchema');
    });

    it('handles path in filename', () => {
      assert.equal(
        deriveRootTypeName('path/to/discovery.xsd'),
        'DiscoverySchema',
      );
    });

    it('returns undefined for undefined input', () => {
      assert.equal(deriveRootTypeName(undefined), undefined);
    });
  });

  describe('schemaToSourceFile', () => {
    it('creates source file from empty schema', () => {
      const schema: Schema = {
        $filename: 'empty.xsd',
      };

      const { project, sourceFile, rootTypeName } = schemaToSourceFile(schema);

      assert.ok(project);
      assert.ok(sourceFile);
      assert.equal(rootTypeName, 'EmptySchema');
    });

    it('generates interface for complex type with sequence', () => {
      const schema: Schema = {
        $filename: 'test.xsd',
        complexType: [
          {
            name: 'Person',
            sequence: {
              element: [
                { name: 'name', type: 'xs:string' },
                { name: 'age', type: 'xs:int' },
              ],
            },
          },
        ],
      };

      const { sourceFile } = schemaToSourceFile(schema);
      const code = sourceFile.getFullText();

      assert.ok(code.includes('export interface PersonType'));
      assert.ok(code.includes('name: string'));
      assert.ok(code.includes('age: number'));
    });

    it('generates type alias for simple type with enumeration', () => {
      const schema: Schema = {
        $filename: 'test.xsd',
        simpleType: [
          {
            name: 'Status',
            restriction: {
              base: 'xs:string',
              enumeration: [{ value: 'active' }, { value: 'inactive' }],
            },
          },
        ],
      };

      const { sourceFile } = schemaToSourceFile(schema);
      const code = sourceFile.getFullText();

      assert.ok(code.includes('export type StatusType'));
      assert.ok(code.includes("'active'"));
      assert.ok(code.includes("'inactive'"));
    });

    it('generates root schema type from elements', () => {
      const schema: Schema = {
        $filename: 'test.xsd',
        element: [{ name: 'person', type: 'Person' }],
        complexType: [
          {
            name: 'Person',
            sequence: {
              element: [{ name: 'name', type: 'xs:string' }],
            },
          },
        ],
      };

      const { sourceFile, rootTypeName } = schemaToSourceFile(schema);
      const code = sourceFile.getFullText();

      assert.equal(rootTypeName, 'TestSchema');
      assert.ok(code.includes('export type TestSchema'));
      // Root type is now wrapped with element name (matches parse() behavior)
      // Element name is 'person' (lowercase) as defined in schema
      assert.ok(
        code.includes('export type TestSchema = { person: PersonType }'),
      );
    });

    it('handles optional elements (minOccurs=0)', () => {
      const schema: Schema = {
        $filename: 'test.xsd',
        complexType: [
          {
            name: 'Person',
            sequence: {
              element: [
                { name: 'nickname', type: 'xs:string', minOccurs: '0' },
              ],
            },
          },
        ],
      };

      const { sourceFile } = schemaToSourceFile(schema);
      const code = sourceFile.getFullText();

      assert.ok(code.includes('nickname?:'));
    });

    it('handles array elements (maxOccurs=unbounded)', () => {
      const schema: Schema = {
        $filename: 'test.xsd',
        complexType: [
          {
            name: 'Person',
            sequence: {
              element: [
                { name: 'phones', type: 'xs:string', maxOccurs: 'unbounded' },
              ],
            },
          },
        ],
      };

      const { sourceFile } = schemaToSourceFile(schema);
      const code = sourceFile.getFullText();

      assert.ok(code.includes('phones: string[]'));
    });

    it('handles complexContent extension with extends', () => {
      const schema: Schema = {
        $filename: 'test.xsd',
        complexType: [
          {
            name: 'Base',
            sequence: {
              element: [{ name: 'name', type: 'xs:string' }],
            },
          },
          {
            name: 'Child',
            complexContent: {
              extension: {
                base: 'Base',
                sequence: {
                  element: [{ name: 'extra', type: 'xs:string' }],
                },
              },
            },
          },
        ],
      };

      const { sourceFile } = schemaToSourceFile(schema);
      const code = sourceFile.getFullText();

      assert.ok(code.includes('export interface ChildType extends BaseType'));
      assert.ok(code.includes('extra: string'));
    });

    it('handles $imports with extends for base types', () => {
      const importedSchema: Schema = {
        $filename: 'base.xsd',
        complexType: [
          {
            name: 'Base',
            sequence: {
              element: [{ name: 'id', type: 'xs:string' }],
            },
          },
        ],
      };

      const schema: Schema = {
        $filename: 'main.xsd',
        $imports: [importedSchema],
        complexType: [
          {
            name: 'Child',
            complexContent: {
              extension: {
                base: 'Base',
                sequence: {
                  element: [{ name: 'extra', type: 'xs:string' }],
                },
              },
            },
          },
        ],
      };

      const { sourceFile } = schemaToSourceFile(schema);
      const code = sourceFile.getFullText();

      // Should have import statement (Base -> BaseType)
      assert.ok(code.includes('import { BaseType } from "./base.types"'));
      // Should extend imported type
      assert.ok(code.includes('extends BaseType'));
    });

    it('uses custom rootTypeName when provided', () => {
      const schema: Schema = {
        $filename: 'test.xsd',
        element: [{ name: 'root', type: 'xs:string' }],
      };

      const { rootTypeName, sourceFile } = schemaToSourceFile(schema, {
        rootTypeName: 'CustomRootType',
      });
      const code = sourceFile.getFullText();

      assert.equal(rootTypeName, 'CustomRootType');
      assert.ok(code.includes('export type CustomRootType'));
    });

    it('uses schemaLocationResolver to load imports', () => {
      // Mock schema that would be loaded from schemaLocation
      const baseSchema: Schema = {
        $filename: 'base.xsd',
        complexType: [
          {
            name: 'Base', // Will become BaseType
            sequence: {
              element: [{ name: 'id', type: 'xs:string' }],
            },
          },
        ],
      };

      // Schema with import element (W3C standard way)
      const schema: Schema = {
        $filename: 'derived.xsd',
        import: [
          {
            namespace: 'http://example.com/base',
            schemaLocation: 'base.xsd',
          },
        ],
        complexType: [
          {
            name: 'Derived',
            complexContent: {
              extension: {
                base: 'Base', // References Base, becomes BaseType
                sequence: {
                  element: [{ name: 'extra', type: 'xs:string' }],
                },
              },
            },
          },
        ],
      };

      // Resolver that returns the base schema
      const resolver = (location: string) => {
        if (location === 'base.xsd') return baseSchema;
        return undefined;
      };

      const { sourceFile } = schemaToSourceFile(schema, {
        schemaLocationResolver: resolver,
      });
      const code = sourceFile.getFullText();

      // Should have import statement from resolved schema (Base -> BaseType)
      assert.ok(code.includes('import { BaseType } from "./base.types"'));
      // Should extend the imported type
      assert.ok(code.includes('extends BaseType'));
    });
  });

  describe('generateInterfaces', () => {
    it('generates interfaces without flatten (default)', () => {
      const schema: Schema = {
        $filename: 'test.xsd',
        complexType: [
          {
            name: 'Person',
            sequence: {
              element: [
                { name: 'name', type: 'xs:string' },
                { name: 'age', type: 'xs:integer' },
              ],
            },
          },
        ],
        element: [{ name: 'person', type: 'Person' }],
      };

      const { code, rootTypeName } = generateInterfaces(schema);

      assert.equal(rootTypeName, 'TestSchema');
      assert.ok(code.includes('export interface PersonType'));
      assert.ok(code.includes('export type TestSchema'));
      // Root type is now wrapped with element name (matches parse() behavior)
      // Element name is 'person' (lowercase) as defined in schema
      assert.ok(
        code.includes('export type TestSchema = { person: PersonType }'),
      );
    });

    it('generates flattened type with flatten: true', () => {
      const schema: Schema = {
        $filename: 'test.xsd',
        complexType: [
          {
            name: 'Person',
            sequence: {
              element: [
                { name: 'name', type: 'xs:string' },
                { name: 'age', type: 'xs:integer' },
              ],
            },
          },
        ],
        element: [{ name: 'person', type: 'Person' }],
      };

      const { code, rootTypeName } = generateInterfaces(schema, {
        flatten: true,
      });

      assert.equal(rootTypeName, 'TestSchema');
      // Should be flattened - inline object type directly (matches parse() behavior)
      assert.ok(code.includes('export type TestSchema'));
      // Root type is the element's content type directly, flattened inline
      assert.ok(code.includes('name: string'));
      assert.ok(code.includes('age: number'));
      // Should NOT have separate interface
      assert.ok(!code.includes('export interface PersonType'));
    });

    it('generates flattened type with inherited properties', () => {
      const baseSchema: Schema = {
        $filename: 'base.xsd',
        complexType: [
          {
            name: 'Base',
            sequence: {
              element: [{ name: 'id', type: 'xs:string' }],
            },
          },
        ],
      };

      const schema: Schema = {
        $filename: 'derived.xsd',
        $imports: [baseSchema],
        complexType: [
          {
            name: 'Derived',
            complexContent: {
              extension: {
                base: 'Base',
                sequence: {
                  element: [{ name: 'extra', type: 'xs:string' }],
                },
              },
            },
          },
        ],
        element: [{ name: 'item', type: 'Derived' }],
      };

      // Generate base schema source file first
      const { sourceFile: baseSourceFile } = schemaToSourceFile(baseSchema);

      const { code } = generateInterfaces(schema, {
        flatten: true,
        additionalSourceFiles: [baseSourceFile],
      });

      // Should have both own and inherited properties inlined
      assert.ok(
        code.includes('id: string'),
        'Should have inherited id property',
      );
      assert.ok(
        code.includes('extra: string'),
        'Should have own extra property',
      );
    });
  });
});
