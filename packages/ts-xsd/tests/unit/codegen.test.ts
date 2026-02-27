/**
 * Codegen Tests
 *
 * Tests for generating TypeScript literals from XSD files.
 */

import { describe, test as it } from 'node:test';
import { strict as assert } from 'node:assert';
import { generateSchemaLiteral, generateSchemaFile } from '../../src/codegen';

const simpleXsd = `<?xml version="1.0"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/person">
  <xs:element name="Person" type="PersonType"/>
  <xs:complexType name="PersonType">
    <xs:sequence>
      <xs:element name="firstName" type="xs:string"/>
      <xs:element name="lastName" type="xs:string"/>
      <xs:element name="age" type="xs:int" minOccurs="0"/>
    </xs:sequence>
    <xs:attribute name="id" type="xs:string" use="required"/>
  </xs:complexType>
</xs:schema>`;

describe('Codegen', () => {
  describe('generateSchemaLiteral', () => {
    it('should generate a TypeScript literal from XSD', () => {
      const result = generateSchemaLiteral(simpleXsd, { name: 'PersonSchema' });

      // Should export as const
      assert.ok(result.includes('export const PersonSchema ='));
      assert.ok(result.includes('as const;'));

      // Should include targetNamespace
      assert.ok(result.includes('"http://example.com/person"'));

      // Should include element
      assert.ok(result.includes('element:'));
      assert.ok(result.includes('"Person"'));

      // Should include complexType
      assert.ok(result.includes('complexType:'));
      assert.ok(result.includes('"PersonType"'));
    });

    it('should generate pretty-printed output by default', () => {
      const result = generateSchemaLiteral(simpleXsd, { name: 'schema' });

      // Should have newlines and indentation
      assert.ok(result.includes('\n'));
      assert.ok(result.includes('  ')); // indentation
    });

    it('should generate compact output when pretty=false', () => {
      const result = generateSchemaLiteral(simpleXsd, {
        name: 'schema',
        pretty: false,
      });

      // Should not have newlines inside the object
      const objectPart = result.slice(
        result.indexOf('{'),
        result.lastIndexOf('}') + 1,
      );
      // Compact output has fewer newlines
      assert.ok(objectPart.split('\n').length < 10);
    });
  });

  describe('generateSchemaFile', () => {
    it('should generate a complete TypeScript file', () => {
      const result = generateSchemaFile(simpleXsd, { name: 'PersonSchema' });

      // Should have header comment
      assert.ok(result.includes('Auto-generated schema literal from XSD'));
      assert.ok(result.includes('DO NOT EDIT'));

      // Should NOT import SchemaLike (removed satisfies)
      assert.ok(!result.includes('import type { SchemaLike }'));

      // Should export the schema
      assert.ok(result.includes('export const PersonSchema ='));

      // Should export the type
      assert.ok(
        result.includes('export type PersonSchemaType = typeof PersonSchema'),
      );
    });

    it('should include custom comment', () => {
      const result = generateSchemaFile(simpleXsd, {
        name: 'PersonSchema',
        comment: 'Source: person.xsd',
      });

      assert.ok(result.includes('Source: person.xsd'));
    });
  });

  describe('W3C XMLSchema.xsd codegen', () => {
    it('should generate literal from W3C XMLSchema.xsd', async () => {
      const { getW3CSchema } = await import('../fixtures');

      const xsdContent = await getW3CSchema();
      const result = generateSchemaLiteral(xsdContent, { name: 'XsdSchema' });

      // Should be valid TypeScript
      assert.ok(result.includes('export const XsdSchema ='));
      assert.ok(result.includes('as const;'));

      // Should include W3C namespace
      assert.ok(result.includes('"http://www.w3.org/2001/XMLSchema"'));

      // Should include key XSD types
      assert.ok(result.includes('complexType:'));
      assert.ok(result.includes('simpleType:'));
      assert.ok(result.includes('element:'));

      // Output should be substantial (W3C XSD is large)
      assert.ok(
        result.length > 10000,
        `Expected large output, got ${result.length} chars`,
      );
    });
  });
});
