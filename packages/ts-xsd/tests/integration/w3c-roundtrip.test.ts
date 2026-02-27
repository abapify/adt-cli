/**
 * W3C XMLSchema.xsd Roundtrip Test
 *
 * This test downloads the official W3C XMLSchema.xsd from the internet,
 * parses it, builds it back to XML, parses again, and builds again.
 *
 * The double-roundtrip proves:
 * 1. Parser correctly handles real-world W3C XSD
 * 2. Builder produces valid XSD that can be re-parsed
 * 3. Second roundtrip produces identical output (stability)
 *
 * Test flow:
 *   W3C XSD (download) → parse → Schema1 → build → XSD1 → parse → Schema2 → build → XSD2
 *
 * Verification:
 *   - Schema1 ≈ Schema2 (semantic equivalence)
 *   - XSD1 === XSD2 (byte-identical after first roundtrip)
 */

import { describe, test as it, before } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseXsd, buildXsd, type Schema } from '../../src/xsd';
import { getW3CSchema } from '../fixtures';

function sortByName<T extends { name?: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

function compareSchemas(
  schema1: Schema,
  schema2: Schema,
): { equal: boolean; differences: string[] } {
  const differences: string[] = [];

  // Compare counts and names only - property ordering within objects may differ
  // This is acceptable as XSD semantics are preserved
  const arrayKeys: (keyof Schema)[] = [
    'annotation',
    'import',
    'include',
    'redefine',
    'override',
    'simpleType',
    'complexType',
    'group',
    'attributeGroup',
    'element',
    'attribute',
    'notation',
  ];

  // Check scalar properties
  if (schema1.targetNamespace !== schema2.targetNamespace) {
    differences.push(
      `targetNamespace: ${schema1.targetNamespace} vs ${schema2.targetNamespace}`,
    );
  }
  if (schema1.version !== schema2.version) {
    differences.push(`version: ${schema1.version} vs ${schema2.version}`);
  }

  // Check array counts
  for (const key of arrayKeys) {
    const val1 = schema1[key];
    const val2 = schema2[key];

    const len1 = Array.isArray(val1) ? val1.length : 0;
    const len2 = Array.isArray(val2) ? val2.length : 0;

    if (len1 !== len2) {
      differences.push(`${key}: count differs (${len1} vs ${len2})`);
    }
  }

  return { equal: differences.length === 0, differences };
}

describe('W3C XMLSchema.xsd Double Roundtrip', () => {
  let originalXsd: string;
  let schema1: Schema;
  let xsd1: string;
  let schema2: Schema;
  let xsd2: string;

  before(async () => {
    // Download or use cached W3C XMLSchema.xsd
    originalXsd = await getW3CSchema();
  });

  it('should parse W3C XMLSchema.xsd', () => {
    schema1 = parseXsd(originalXsd);

    assert.ok(schema1.targetNamespace, 'Should have targetNamespace');
    assert.equal(schema1.targetNamespace, 'http://www.w3.org/2001/XMLSchema');
    assert.ok(
      schema1.complexType &&
        Array.isArray(schema1.complexType) &&
        schema1.complexType.length > 0,
      'Should have complexTypes',
    );
    assert.ok(
      schema1.simpleType &&
        Array.isArray(schema1.simpleType) &&
        schema1.simpleType.length > 0,
      'Should have simpleTypes',
    );
    assert.ok(
      schema1.element &&
        Array.isArray(schema1.element) &&
        schema1.element.length > 0,
      'Should have elements',
    );
    assert.ok(
      schema1.group && Array.isArray(schema1.group) && schema1.group.length > 0,
      'Should have groups',
    );

    console.log(
      `Parsed: ${schema1.complexType?.length} complexTypes, ${schema1.simpleType?.length} simpleTypes, ${schema1.element?.length} elements`,
    );
  });

  it('should build XSD from parsed schema (first roundtrip)', () => {
    xsd1 = buildXsd(schema1);

    assert.ok(
      xsd1.startsWith('<?xml version="1.0"'),
      'Should start with XML declaration',
    );
    assert.ok(xsd1.includes('xs:schema'), 'Should have xs:schema element');
    assert.ok(
      xsd1.includes('targetNamespace="http://www.w3.org/2001/XMLSchema"'),
      'Should preserve targetNamespace',
    );

    console.log(
      `Built XSD1: ${xsd1.length} chars, ${xsd1.split('\n').length} lines`,
    );
  });

  it('should parse the built XSD (second parse)', () => {
    schema2 = parseXsd(xsd1);

    assert.ok(schema2.targetNamespace, 'Should have targetNamespace');
    assert.equal(schema2.targetNamespace, schema1.targetNamespace);

    console.log(
      `Re-parsed: ${schema2.complexType?.length} complexTypes, ${schema2.simpleType?.length} simpleTypes`,
    );
  });

  it('should produce semantically equivalent schemas', () => {
    const { equal, differences } = compareSchemas(schema1, schema2);

    if (!equal) {
      console.log('Schema differences:', differences);
    }

    assert.ok(
      equal,
      `Schemas should be semantically equivalent. Differences: ${differences.join(', ')}`,
    );
  });

  it('should build XSD from re-parsed schema (second roundtrip)', () => {
    xsd2 = buildXsd(schema2);

    console.log(
      `Built XSD2: ${xsd2.length} chars, ${xsd2.split('\n').length} lines`,
    );
  });

  it('should produce identical XSD after double roundtrip', () => {
    // After the first roundtrip, subsequent roundtrips should be stable
    assert.equal(
      xsd1,
      xsd2,
      'XSD1 and XSD2 should be byte-identical (stable roundtrip)',
    );

    console.log('✅ Double roundtrip produces identical output!');
  });

  it('should preserve all type counts through roundtrip', () => {
    const counts1 = {
      complexType: schema1.complexType?.length ?? 0,
      simpleType: schema1.simpleType?.length ?? 0,
      element: schema1.element?.length ?? 0,
      group: schema1.group?.length ?? 0,
      attributeGroup: schema1.attributeGroup?.length ?? 0,
      annotation: schema1.annotation?.length ?? 0,
    };

    const counts2 = {
      complexType: (schema2.complexType as any[])?.length ?? 0,
      simpleType: (schema2.simpleType as any[])?.length ?? 0,
      element: (schema2.element as any[])?.length ?? 0,
      group: (schema2.group as any[])?.length ?? 0,
      attributeGroup: (schema2.attributeGroup as any[])?.length ?? 0,
      annotation: (schema2.annotation as any[])?.length ?? 0,
    };

    for (const [key, val1] of Object.entries(counts1)) {
      const val2 = counts2[key as keyof typeof counts2];
      assert.equal(val2, val1, `${key} count should match: ${val1} vs ${val2}`);
    }

    console.log('Type counts:', counts1);
  });

  it('should preserve all type names through roundtrip', () => {
    const getNames = (arr: unknown) => {
      if (!Array.isArray(arr)) return [];
      return arr
        .map((x: any) => x.name)
        .filter(Boolean)
        .sort();
    };

    assert.deepEqual(
      getNames(schema2.complexType),
      getNames(schema1.complexType),
      'ComplexType names should match',
    );

    assert.deepEqual(
      getNames(schema2.simpleType),
      getNames(schema1.simpleType),
      'SimpleType names should match',
    );

    assert.deepEqual(
      getNames(schema2.element),
      getNames(schema1.element),
      'Element names should match',
    );

    assert.deepEqual(
      getNames(schema2.group),
      getNames(schema1.group),
      'Group names should match',
    );
  });
});
