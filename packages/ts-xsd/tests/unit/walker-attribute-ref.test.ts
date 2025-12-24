/**
 * Tests for walkAttributes with attribute references (ref)
 *
 * This test covers the fix for parsing namespaced attribute references
 * like `ref="atcfinding:checkId"` which are used in SAP ADT schemas.
 *
 * @see https://www.w3.org/TR/xmlschema11-1/#Attribute_Declaration_details
 */

import { describe, test as it } from 'node:test';
import { strict as assert } from 'node:assert';
import { walkAttributes } from '../../src/walker';
import type { SchemaLike, ComplexTypeLike } from '../../src/xsd/schema-like';

describe('walkAttributes with attribute references', () => {
  it('should resolve attribute ref from same schema', () => {
    // Schema with top-level attribute and complexType using ref
    const schema = {
      attribute: [{ name: 'checkId', type: 'xs:string' }],
      complexType: [
        {
          name: 'Finding',
          attribute: [
            { ref: 'checkId' }, // Reference without namespace prefix
          ],
        },
      ],
    } as const;

    const ct = schema.complexType[0] as ComplexTypeLike;
    const attrs = [...walkAttributes(ct, schema as SchemaLike)];

    assert.equal(attrs.length, 1);
    assert.equal(attrs[0].attribute.name, 'checkId');
    assert.equal(attrs[0].attribute.type, 'xs:string');
  });

  it('should resolve attribute ref from $imports', () => {
    // Imported schema with top-level attribute
    const importedSchema = {
      targetNamespace: 'http://www.sap.com/adt/atc/finding',
      attribute: [
        { name: 'checkId', type: 'xs:string' },
        { name: 'checkTitle', type: 'xs:string' },
        { name: 'priority', type: 'xs:int' },
      ],
    } as const;

    // Main schema importing and using refs
    const schema = {
      $imports: [importedSchema],
      complexType: [
        {
          name: 'AtcFinding',
          attribute: [
            { ref: 'atcfinding:checkId' }, // Namespaced ref
            { ref: 'atcfinding:checkTitle' },
            { ref: 'atcfinding:priority' },
          ],
        },
      ],
    } as const;

    const ct = schema.complexType[0] as ComplexTypeLike;
    const attrs = [...walkAttributes(ct, schema as SchemaLike)];

    assert.equal(attrs.length, 3);

    const names = attrs.map((a) => a.attribute.name);
    assert.ok(names.includes('checkId'));
    assert.ok(names.includes('checkTitle'));
    assert.ok(names.includes('priority'));

    // Check type is preserved
    const priorityAttr = attrs.find((a) => a.attribute.name === 'priority');
    assert.equal(priorityAttr?.attribute.type, 'xs:int');
  });

  it('should merge use from ref with resolved attribute', () => {
    const importedSchema = {
      attribute: [{ name: 'optionalAttr', type: 'xs:string', use: 'optional' }],
    } as const;

    const schema = {
      $imports: [importedSchema],
      complexType: [
        {
          name: 'Test',
          attribute: [
            { ref: 'ns:optionalAttr', use: 'required' }, // Override use
          ],
        },
      ],
    } as const;

    const ct = schema.complexType[0] as ComplexTypeLike;
    const attrs = [...walkAttributes(ct, schema as SchemaLike)];

    assert.equal(attrs.length, 1);
    assert.equal(attrs[0].attribute.name, 'optionalAttr');
    assert.equal(attrs[0].required, true); // use='required' from ref
  });

  it('should handle mixed direct attributes and refs', () => {
    const importedSchema = {
      attribute: [{ name: 'importedAttr', type: 'xs:string' }],
    } as const;

    const schema = {
      $imports: [importedSchema],
      complexType: [
        {
          name: 'Mixed',
          attribute: [
            { name: 'directAttr', type: 'xs:int' }, // Direct attribute
            { ref: 'ns:importedAttr' }, // Referenced attribute
          ],
        },
      ],
    } as const;

    const ct = schema.complexType[0] as ComplexTypeLike;
    const attrs = [...walkAttributes(ct, schema as SchemaLike)];

    assert.equal(attrs.length, 2);

    const names = attrs.map((a) => a.attribute.name);
    assert.ok(names.includes('directAttr'));
    assert.ok(names.includes('importedAttr'));
  });

  it('should resolve refs in complexContent/extension', () => {
    const importedSchema = {
      attribute: [{ name: 'extAttr', type: 'xs:string' }],
      complexType: [
        {
          name: 'BaseType',
          attribute: [{ name: 'baseAttr', type: 'xs:string' }],
        },
      ],
    } as const;

    const schema = {
      $imports: [importedSchema],
      complexType: [
        {
          name: 'ExtendedType',
          complexContent: {
            extension: {
              base: 'ns:BaseType',
              attribute: [
                { ref: 'ns:extAttr' }, // Ref in extension
              ],
            },
          },
        },
      ],
    } as const;

    const ct = schema.complexType[0] as ComplexTypeLike;
    const attrs = [...walkAttributes(ct, schema as SchemaLike)];

    // Should have both inherited and extension attributes
    assert.equal(attrs.length, 2);

    const names = attrs.map((a) => a.attribute.name);
    assert.ok(names.includes('baseAttr')); // Inherited
    assert.ok(names.includes('extAttr')); // From ref
  });

  it('should fallback to ref name if attribute not found', () => {
    // Schema with ref to non-existent attribute
    const schema = {
      complexType: [
        {
          name: 'Test',
          attribute: [{ ref: 'unknown:missingAttr' }],
        },
      ],
    } as const;

    const ct = schema.complexType[0] as ComplexTypeLike;
    const attrs = [...walkAttributes(ct, schema as SchemaLike)];

    // Should still yield an attribute with the ref name
    assert.equal(attrs.length, 1);
    assert.equal(attrs[0].attribute.name, 'missingAttr');
  });
});
