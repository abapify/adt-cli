/**
 * XSD Roundtrip Test
 *
 * Tests that XMLSchema can be:
 * 1. Parsed from XSD → Schema object
 * 2. Built back to XSD string
 * 3. Re-parsed to identical Schema object
 */

import { describe, test as it, before } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildXsd, parseXsd, type Schema } from '../../src/xsd';
import { getW3CSchema } from '../fixtures';

let XMLSchema: Schema;

describe('XSD Roundtrip', () => {
  before(async () => {
    const xsdContent = await getW3CSchema();
    XMLSchema = parseXsd(xsdContent);
  });

  it('should build XSD from XMLSchema', () => {
    const xsd = buildXsd(XMLSchema);

    assert.ok(xsd.startsWith('<?xml version="1.0"'));
    assert.ok(xsd.includes('xs:schema'));
    assert.ok(
      xsd.includes('targetNamespace="http://www.w3.org/2001/XMLSchema"'),
    );
  });

  it('should parse built XSD back to Schema', () => {
    const xsd = buildXsd(XMLSchema);
    const reparsed = parseXsd(xsd);

    assert.equal(reparsed.targetNamespace, XMLSchema.targetNamespace);
    assert.equal(reparsed.version, XMLSchema.version);
    assert.equal(reparsed.elementFormDefault, XMLSchema.elementFormDefault);
  });

  it('should preserve complexType count in roundtrip', () => {
    const xsd = buildXsd(XMLSchema);
    const reparsed = parseXsd(xsd);

    const original = XMLSchema.complexType;
    const parsed = reparsed.complexType;
    const originalCount = Array.isArray(original) ? original.length : 0;
    const reparsedCount = Array.isArray(parsed) ? parsed.length : 0;

    assert.equal(reparsedCount, originalCount, 'complexType count mismatch');
  });

  it('should preserve simpleType count in roundtrip', () => {
    const xsd = buildXsd(XMLSchema);
    const reparsed = parseXsd(xsd);

    const original = XMLSchema.simpleType;
    const parsed = reparsed.simpleType;
    const originalCount = Array.isArray(original) ? original.length : 0;
    const reparsedCount = Array.isArray(parsed) ? parsed.length : 0;

    assert.equal(reparsedCount, originalCount, 'simpleType count mismatch');
  });

  it('should preserve group count in roundtrip', () => {
    const xsd = buildXsd(XMLSchema);
    const reparsed = parseXsd(xsd);

    const originalCount = XMLSchema.group?.length ?? 0;
    const reparsedCount = reparsed.group?.length ?? 0;

    assert.equal(reparsedCount, originalCount, 'group count mismatch');
  });

  it('should preserve element count in roundtrip', () => {
    const xsd = buildXsd(XMLSchema);
    const reparsed = parseXsd(xsd);

    const originalCount = XMLSchema.element?.length ?? 0;
    const reparsedCount = reparsed.element?.length ?? 0;

    assert.equal(reparsedCount, originalCount, 'element count mismatch');
  });

  it('should preserve attributeGroup count in roundtrip', () => {
    const xsd = buildXsd(XMLSchema);
    const reparsed = parseXsd(xsd);

    const originalCount = XMLSchema.attributeGroup?.length ?? 0;
    const reparsedCount = reparsed.attributeGroup?.length ?? 0;

    assert.equal(reparsedCount, originalCount, 'attributeGroup count mismatch');
  });

  it('should preserve annotation count in roundtrip', () => {
    const xsd = buildXsd(XMLSchema);
    const reparsed = parseXsd(xsd);

    const originalCount = XMLSchema.annotation?.length ?? 0;
    const reparsedCount = reparsed.annotation?.length ?? 0;

    assert.equal(reparsedCount, originalCount, 'annotation count mismatch');
  });

  it('should preserve import in roundtrip', () => {
    const xsd = buildXsd(XMLSchema);
    const reparsed = parseXsd(xsd);

    const originalCount = XMLSchema.import?.length ?? 0;
    const reparsedCount = reparsed.import?.length ?? 0;

    assert.equal(reparsedCount, originalCount, 'import count mismatch');

    if (originalCount > 0 && XMLSchema.import && reparsed.import) {
      const original = XMLSchema.import[0];
      const parsed = reparsed.import[0];
      assert.equal(parsed.namespace, original.namespace);
      assert.equal(parsed.schemaLocation, original.schemaLocation);
    }
  });

  it('should preserve complexType names in roundtrip', () => {
    const xsd = buildXsd(XMLSchema);
    const reparsed = parseXsd(xsd);

    const original = XMLSchema.complexType;
    const parsed = reparsed.complexType;
    const originalNames = Array.isArray(original)
      ? original.map((ct) => ct.name).sort()
      : [];
    const reparsedNames = Array.isArray(parsed)
      ? parsed.map((ct) => ct.name).sort()
      : [];

    assert.deepEqual(reparsedNames, originalNames);
  });

  it('should preserve simpleType names in roundtrip', () => {
    const xsd = buildXsd(XMLSchema);
    const reparsed = parseXsd(xsd);

    const original = XMLSchema.simpleType;
    const parsed = reparsed.simpleType;
    const originalNames = Array.isArray(original)
      ? original.map((st) => st.name).sort()
      : [];
    const reparsedNames = Array.isArray(parsed)
      ? parsed.map((st) => st.name).sort()
      : [];

    assert.deepEqual(reparsedNames, originalNames);
  });

  it('should preserve element names in roundtrip', () => {
    const xsd = buildXsd(XMLSchema);
    const reparsed = parseXsd(xsd);

    const originalNames = XMLSchema.element?.map((el) => el.name).sort() ?? [];
    const reparsedNames = reparsed.element?.map((el) => el.name).sort() ?? [];

    assert.deepEqual(reparsedNames, originalNames);
  });

  it('should not add xmlns when not present in schema', () => {
    // Create a schema without xmlns - no xmlns should be added
    const schemaWithoutXmlns: Schema = {
      targetNamespace: 'http://example.com',
      simpleType: [{ name: 'test', restriction: { base: 'xs:string' } }],
    };
    const xsd = buildXsd(schemaWithoutXmlns);

    // No xmlns should be invented
    assert.ok(!xsd.includes('xmlns:'));
    assert.ok(!xsd.includes('xmlns='));
    // But elements should still use the configured prefix
    assert.ok(xsd.includes('xs:schema'));
    assert.ok(xsd.includes('xs:simpleType'));
  });

  it('should preserve original $xmlns when present', () => {
    // XMLSchema has $xmlns:xs from parsing - should be preserved
    const xsd = buildXsd(XMLSchema);

    assert.ok(XMLSchema.$xmlns?.xs, 'Parsed schema should have $xmlns.xs');
    assert.ok(xsd.includes('xmlns:xs='));
    assert.ok(xsd.includes('xs:schema'));
  });

  it('should build without pretty printing', () => {
    const xsd = buildXsd(XMLSchema, { pretty: false });

    // Without pretty printing, there should be no newlines between elements
    assert.ok(!xsd.includes('>\n  <'));
  });
});
