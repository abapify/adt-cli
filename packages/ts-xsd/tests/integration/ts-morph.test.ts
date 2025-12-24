/**
 * Integration tests for codegen/ts-morph module
 *
 * Tests schema to ts-morph SourceFile conversion with real XSD schemas
 * and verifies generated TypeScript output.
 *
 * Output files: tests/integration/generated/ts-morph/
 */

import { describe, test as it, before } from 'node:test';
import { strict as assert } from 'node:assert';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { schemaToSourceFile, flattenType } from '../../src/codegen/ts-morph';
import type { Schema } from '../../src/xsd/types';

const OUTPUT_DIR = join(import.meta.dirname, 'generated/ts-morph');

function writeOutput(filename: string, content: string): void {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  const filepath = join(OUTPUT_DIR, filename);
  writeFileSync(filepath, content);
  console.log(`  → Written: ${filepath}`);
}

describe('ts-morph integration', () => {
  before(() => {
    // Ensure output directory exists
    if (!existsSync(OUTPUT_DIR)) {
      mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    console.log(`\nOutput directory: ${OUTPUT_DIR}\n`);
  });

  describe('complex schema with inheritance', () => {
    // Simulates ADT-like schema structure with imports and inheritance
    const adtcoreSchema: Schema = {
      $filename: 'adtcore.xsd',
      targetNamespace: 'http://www.sap.com/adt/core',
      complexType: [
        {
          name: 'AdtObject',
          sequence: {
            element: [
              { name: 'name', type: 'xs:string' },
              { name: 'description', type: 'xs:string', minOccurs: '0' },
            ],
          },
          attribute: [
            { name: 'uri', type: 'xs:string', use: 'required' },
            { name: 'type', type: 'xs:string', use: 'required' },
          ],
        },
      ],
    };

    const classesSchema: Schema = {
      $filename: 'classes.xsd',
      targetNamespace: 'http://www.sap.com/adt/oo/classes',
      $imports: [adtcoreSchema],
      complexType: [
        {
          name: 'AbapClass',
          complexContent: {
            extension: {
              base: 'adtcore:AdtObject',
              sequence: {
                element: [
                  { name: 'superClass', type: 'xs:string', minOccurs: '0' },
                  { name: 'interfaces', type: 'InterfaceList', minOccurs: '0' },
                ],
              },
              attribute: [
                { name: 'final', type: 'xs:boolean' },
                { name: 'abstract', type: 'xs:boolean' },
              ],
            },
          },
        },
        {
          name: 'InterfaceList',
          sequence: {
            element: [
              { name: 'interface', type: 'xs:string', maxOccurs: 'unbounded' },
            ],
          },
        },
      ],
      element: [{ name: 'abapClass', type: 'AbapClass' }],
    };

    it('generates TypeScript interfaces with imports and extends', () => {
      const { sourceFile, rootTypeName } = schemaToSourceFile(classesSchema);
      const code = sourceFile.getFullText();

      // Write to file for inspection
      writeOutput('classes.types.ts', code);

      // Verify import statement
      assert.ok(
        code.includes('import { AdtObjectType } from "./adtcore.types"'),
        'Should import AdtObjectType from adtcore.types',
      );

      // Verify AbapClass extends AdtObjectType
      assert.ok(
        code.includes('export interface AbapClassType extends AdtObjectType'),
        'AbapClassType should extend AdtObjectType',
      );

      // Verify AbapClass properties
      assert.ok(
        code.includes('superClass?:'),
        'Should have optional superClass',
      );
      assert.ok(
        code.includes('interfaces?:'),
        'Should have optional interfaces',
      );
      assert.ok(
        code.includes('final?:'),
        'Should have optional final attribute',
      );
      assert.ok(
        code.includes('abstract?:'),
        'Should have optional abstract attribute',
      );

      // Verify InterfaceList
      assert.ok(
        code.includes('export interface InterfaceListType'),
        'Should have InterfaceListType interface',
      );
      assert.ok(
        code.includes('interface: string[]'),
        'InterfaceListType should have interface array',
      );

      // Verify root type
      assert.equal(rootTypeName, 'ClassesSchema');
      assert.ok(
        code.includes('export type ClassesSchema'),
        'Should have ClassesSchema root type',
      );
    });

    it('generates base schema interfaces', () => {
      const { sourceFile } = schemaToSourceFile(adtcoreSchema);
      const code = sourceFile.getFullText();

      // Write to file for inspection
      writeOutput('adtcore.types.ts', code);
    });

    it('flattens class schema with inheritance', () => {
      // Generate base schema first
      const { sourceFile: adtcoreFile } = schemaToSourceFile(adtcoreSchema);

      // Generate classes schema (with imports)
      const { sourceFile, rootTypeName } = schemaToSourceFile(classesSchema);

      // Flatten the classes schema with additional source files for resolving imports
      assert.ok(rootTypeName, 'Should have root type name');
      const flattened = flattenType(sourceFile, rootTypeName, {
        additionalSourceFiles: [adtcoreFile],
      });
      const flatCode = flattened.getFullText();
      writeOutput('classes.flattened.ts', flatCode);

      // Verify flattened output has all properties inlined (including inherited from AdtObjectType)
      // Root type is now the element's content type directly (matches parse() behavior)
      // So we check for the content properties, not the element wrapper
      assert.ok(
        flatCode.includes('name:'),
        'Should have inherited name property',
      );
      assert.ok(
        flatCode.includes('description?:'),
        'Should have inherited description property',
      );
      assert.ok(
        flatCode.includes('uri:'),
        'Should have inherited uri property',
      );
      assert.ok(
        flatCode.includes('superClass?:'),
        'Should have superClass property',
      );
      assert.ok(
        flatCode.includes('interfaces?:'),
        'Should have interfaces property',
      );
      assert.ok(
        flatCode.includes('interface:'),
        'Should have nested interface array',
      );
    });
  });

  describe('schema with enumerations', () => {
    const schema: Schema = {
      $filename: 'atc.xsd',
      simpleType: [
        {
          name: 'Priority',
          restriction: {
            base: 'xs:string',
            enumeration: [{ value: '1' }, { value: '2' }, { value: '3' }],
          },
        },
        {
          name: 'MessageKind',
          restriction: {
            base: 'xs:string',
            enumeration: [
              { value: 'error' },
              { value: 'warning' },
              { value: 'info' },
            ],
          },
        },
      ],
      complexType: [
        {
          name: 'Finding',
          sequence: {
            element: [
              { name: 'message', type: 'xs:string' },
              { name: 'priority', type: 'Priority' },
              { name: 'messageKind', type: 'MessageKind' },
              { name: 'location', type: 'Location' },
            ],
          },
        },
        {
          name: 'Location',
          attribute: [
            { name: 'uri', type: 'xs:string', use: 'required' },
            { name: 'line', type: 'xs:int' },
            { name: 'column', type: 'xs:int' },
          ],
        },
      ],
      element: [{ name: 'finding', type: 'Finding' }],
    };

    it('generates type aliases for enumerations', () => {
      const { sourceFile } = schemaToSourceFile(schema);
      const code = sourceFile.getFullText();

      // Write to file for inspection
      writeOutput('atc.types.ts', code);

      // Verify enumeration types
      assert.ok(
        code.includes("export type PriorityType = '1' | '2' | '3'"),
        'Should have PriorityType union',
      );
      assert.ok(
        code.includes(
          "export type MessageKindType = 'error' | 'warning' | 'info'",
        ),
        'Should have MessageKindType union',
      );

      // Verify Finding interface uses enum types
      assert.ok(
        code.includes('export interface FindingType'),
        'Should have FindingType interface',
      );

      // Verify Location interface
      assert.ok(
        code.includes('export interface LocationType'),
        'Should have LocationType interface',
      );
      assert.ok(
        code.includes('uri: string'),
        'Location should have required uri',
      );
      assert.ok(code.includes('line?:'), 'Location should have optional line');
      assert.ok(
        code.includes('column?:'),
        'Location should have optional column',
      );
    });
  });

  describe('flattenType integration', () => {
    const schema: Schema = {
      $filename: 'nested.xsd',
      complexType: [
        {
          name: 'Root',
          sequence: {
            element: [
              { name: 'person', type: 'Person' },
              { name: 'metadata', type: 'Metadata' },
            ],
          },
        },
        {
          name: 'Person',
          sequence: {
            element: [
              { name: 'name', type: 'xs:string' },
              { name: 'address', type: 'Address' },
            ],
          },
        },
        {
          name: 'Address',
          sequence: {
            element: [
              { name: 'street', type: 'xs:string' },
              { name: 'city', type: 'xs:string' },
              { name: 'country', type: 'xs:string' },
            ],
          },
        },
        {
          name: 'Metadata',
          attribute: [
            { name: 'version', type: 'xs:string' },
            { name: 'timestamp', type: 'xs:dateTime' },
          ],
        },
      ],
      element: [{ name: 'root', type: 'Root' }],
    };

    it('flattens nested types into single inline type', () => {
      const { sourceFile, rootTypeName } = schemaToSourceFile(schema);
      const code = sourceFile.getFullText();

      // Write interfaces to file
      writeOutput('nested.types.ts', code);

      assert.ok(rootTypeName, 'Should have root type name');

      const flattened = flattenType(sourceFile, rootTypeName);
      const flatCode = flattened.getFullText();

      // Write flattened type to file
      writeOutput('nested.flattened.ts', flatCode);

      // Verify flattened output has no type references
      assert.ok(
        !flatCode.includes('PersonType'),
        'Should not reference PersonType',
      );
      assert.ok(
        !flatCode.includes('AddressType'),
        'Should not reference AddressType',
      );
      assert.ok(
        !flatCode.includes('MetadataType'),
        'Should not reference MetadataType',
      );
      assert.ok(
        !flatCode.includes('RootType'),
        'Should not reference RootType',
      );

      // Verify all properties are inlined
      // Root type is now the element's content type directly (matches parse() behavior)
      // So we check for content properties, not the element wrapper
      assert.ok(flatCode.includes('person:'), 'Should have person property');
      assert.ok(flatCode.includes('name:'), 'Should have name property');
      assert.ok(flatCode.includes('address:'), 'Should have address property');
      assert.ok(flatCode.includes('street:'), 'Should have street property');
      assert.ok(flatCode.includes('city:'), 'Should have city property');
    });
  });
});
