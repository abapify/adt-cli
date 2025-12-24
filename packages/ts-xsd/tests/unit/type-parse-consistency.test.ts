/**
 * Test to verify that generated types match parse() behavior
 *
 * Both parse() and generated types wrap content with root element name:
 * - parse(): returns { elementName: { ...content } }
 * - Generated types: { elementName: Type }
 *
 * This enables type discrimination for multi-root schemas.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseXml, buildXml } from '../../src/xml/index';
import { schemaToSourceFile } from '../../src/codegen/ts-morph';
import type { SchemaLike } from '../../src/xsd/schema-like';
import type { Schema } from '../../src/xsd/types';

describe('Type and Parse Consistency', () => {
  // Simple schema with one root element
  const personSchema = {
    $filename: 'person.xsd',
    element: [{ name: 'person', type: 'PersonType' }],
    complexType: [
      {
        name: 'PersonType',
        sequence: {
          element: [
            { name: 'name', type: 'xs:string' },
            { name: 'age', type: 'xs:int' },
          ],
        },
      },
    ],
  } as const satisfies SchemaLike;

  const personXml = `<person><name>John</name><age>30</age></person>`;

  describe('Consistent behavior (wrapped)', () => {
    it('parse() returns content WITH element wrapper', () => {
      const result = parseXml(personSchema, personXml);

      // parse() returns { person: { name: 'John', age: 30 } }
      // Wrapped with element name for type discrimination
      assert.deepStrictEqual(result, { person: { name: 'John', age: 30 } });
      assert.ok('person' in result, 'parse() should wrap with element name');
    });

    it('generated type wraps with element name (matches parse)', () => {
      const { sourceFile } = schemaToSourceFile(
        personSchema as unknown as Schema,
      );
      const code = sourceFile.getFullText();

      // Generated type is: { person: PersonType }
      assert.ok(
        code.includes('person: PersonType'),
        'Generated type should wrap with element name',
      );
    });

    it('PROVES CONSISTENCY: parse result matches generated type structure', () => {
      const parsed = parseXml(personSchema, personXml);
      const { sourceFile } = schemaToSourceFile(
        personSchema as unknown as Schema,
      );
      const code = sourceFile.getFullText();

      // parse() returns: { person: { name: 'John', age: 30 } }
      // Generated type is: { person: PersonType }

      // Both have 'person' at root level - CONSISTENT!
      assert.ok('person' in parsed, 'parsed has person wrapper');
      assert.ok(code.includes('person: PersonType'), 'type has person wrapper');
    });
  });

  describe('Roundtrip consistency', () => {
    it('parse -> build -> parse should be consistent', () => {
      const parsed1 = parseXml(personSchema, personXml);
      const built = buildXml(personSchema, parsed1);
      const parsed2 = parseXml(personSchema, built);

      assert.deepStrictEqual(
        parsed1,
        parsed2,
        'Roundtrip should preserve data',
      );
    });
  });

  describe('Multi-root schema behavior', () => {
    const multiRootSchema = {
      $filename: 'multi.xsd',
      element: [
        { name: 'person', type: 'PersonType' },
        { name: 'company', type: 'CompanyType' },
      ],
      complexType: [
        {
          name: 'PersonType',
          sequence: {
            element: [{ name: 'name', type: 'xs:string' }],
          },
        },
        {
          name: 'CompanyType',
          sequence: {
            element: [{ name: 'title', type: 'xs:string' }],
          },
        },
      ],
    } as const satisfies SchemaLike;

    it('parse() returns wrapped content for type discrimination', () => {
      const personXml = `<person><name>John</name></person>`;
      const companyXml = `<company><title>Acme</title></company>`;

      const parsedPerson = parseXml(multiRootSchema, personXml);
      const parsedCompany = parseXml(multiRootSchema, companyXml);

      // Both return wrapped content for type discrimination
      assert.deepStrictEqual(parsedPerson, { person: { name: 'John' } });
      assert.deepStrictEqual(parsedCompany, { company: { title: 'Acme' } });

      // Each has its element name as wrapper
      assert.ok('person' in parsedPerson);
      assert.ok('company' in parsedCompany);
    });

    it('generated type is union of wrapped elements', () => {
      const { sourceFile } = schemaToSourceFile(
        multiRootSchema as unknown as Schema,
      );
      const code = sourceFile.getFullText();

      // Generated root type is union: { person: PersonType } | { company: CompanyType }
      assert.ok(code.includes('export type MultiSchema'));
      assert.ok(code.includes('person: PersonType'), 'has person wrapper');
      assert.ok(code.includes('company: CompanyType'), 'has company wrapper');
    });
  });
});
