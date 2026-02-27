/**
 * XSD Parser Unit Tests
 */

import { describe, test as it, before } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseXsd, type Schema } from '../../src/xsd';
import { getW3CSchema } from '../fixtures';

let xsdContent: string;

describe('parseXsd', () => {
  before(async () => {
    xsdContent = await getW3CSchema();
  });

  it('should parse XMLSchema.xsd', () => {
    const schema = parseXsd(xsdContent);

    assert.equal(schema.targetNamespace, 'http://www.w3.org/2001/XMLSchema');
    assert.equal(schema.version, '1.0');
    assert.equal(schema.elementFormDefault, 'qualified');
  });

  it('should parse complexTypes', () => {
    const schema = parseXsd(xsdContent);

    assert.ok(Array.isArray(schema.complexType));
    assert.equal(schema.complexType?.length, 37);

    const firstType = schema.complexType?.[0];
    assert.equal(firstType?.name, 'openAttrs');
  });

  it('should parse simpleTypes with enumerations', () => {
    const schema = parseXsd(xsdContent);

    const formChoice = schema.simpleType?.find(
      (st) => st.name === 'formChoice',
    );

    assert.ok(formChoice, 'formChoice should exist');
    assert.equal(formChoice?.restriction?.enumeration?.length, 2);
    assert.equal(formChoice?.restriction?.enumeration?.[0]?.value, 'qualified');
    assert.equal(
      formChoice?.restriction?.enumeration?.[1]?.value,
      'unqualified',
    );
  });

  it('should parse groups', () => {
    const schema = parseXsd(xsdContent);

    assert.ok(Array.isArray(schema.group));
    assert.equal(schema.group?.length, 13);
  });

  it('should parse elements', () => {
    const schema = parseXsd(xsdContent);

    assert.ok(Array.isArray(schema.element));
    assert.equal(schema.element?.length, 47);
  });

  it('should parse annotations with documentation', () => {
    const schema = parseXsd(xsdContent);

    assert.ok(Array.isArray(schema.annotation));
    assert.ok((schema.annotation?.length ?? 0) > 0);

    const firstAnnotation = schema.annotation?.[0];
    assert.ok(firstAnnotation?.documentation);
    assert.ok(
      firstAnnotation?.documentation?.[0]?._text?.includes('Part 1 version'),
    );
  });
});

describe('Schema type validation', () => {
  it('should satisfy Schema type', () => {
    // Parse W3C XSD and verify it satisfies Schema type
    const schema: Schema = parseXsd(xsdContent);

    assert.equal(schema.targetNamespace, 'http://www.w3.org/2001/XMLSchema');
  });
});

describe('$xmlns declarations', () => {
  it('should extract $xmlns declarations from schema root', () => {
    const schema = parseXsd(xsdContent);

    assert.ok(schema.$xmlns, '$xmlns should be present');
    assert.equal(schema.$xmlns?.xs, 'http://www.w3.org/2001/XMLSchema');
  });

  it('should extract multiple $xmlns declarations', () => {
    const xsd = `<?xml version="1.0"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           xmlns:tns="http://example.com/order"
           xmlns:ext="http://example.com/extensions"
           targetNamespace="http://example.com/order">
  <xs:element name="Order" type="tns:OrderType"/>
</xs:schema>`;

    const schema = parseXsd(xsd);

    assert.ok(schema.$xmlns, '$xmlns should be present');
    assert.equal(schema.$xmlns?.xs, 'http://www.w3.org/2001/XMLSchema');
    assert.equal(schema.$xmlns?.tns, 'http://example.com/order');
    assert.equal(schema.$xmlns?.ext, 'http://example.com/extensions');
  });

  it('should extract default namespace (xmlns without prefix)', () => {
    const xsd = `<?xml version="1.0"?>
<schema xmlns="http://www.w3.org/2001/XMLSchema"
        xmlns:tns="http://example.com/order"
        targetNamespace="http://example.com/order">
  <element name="Order"/>
</schema>`;

    const schema = parseXsd(xsd);

    assert.ok(schema.$xmlns, '$xmlns should be present');
    assert.equal(schema.$xmlns?.[''], 'http://www.w3.org/2001/XMLSchema');
    assert.equal(schema.$xmlns?.tns, 'http://example.com/order');
  });
});
