/**
 * Test for substitution group handling in interface generation
 *
 * When a schema has elements that substitute an abstract element,
 * the generator should produce a complete type that includes all
 * substituting elements as optional properties.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateInterfaces } from '../../src/codegen/interface-generator';
import { resolveSchema } from '../../src/xsd/resolve';
import type { Schema } from '../../src/xsd/types';

/**
 * Substitution group support is implemented in the resolver (resolveSchema).
 *
 * The simplified generator expects pre-resolved schemas. Substitution group expansion
 * happens in src/xsd/resolve.ts (resolveSchema function).
 *
 * When an element has substitutionGroup="ns:AbstractElement", the resolver:
 * 1. Collects all elements that substitute for the abstract element
 * 2. In types that reference the abstract element (via ref), expands to include all substitutes
 */
describe('substitution group interface generation', () => {
  // Simulates asx.xsd - defines abstract Schema element
  const asxSchema: Schema = {
    targetNamespace: 'http://www.sap.com/abapxml',
    elementFormDefault: 'qualified',
    element: [
      { name: 'Schema', abstract: true },
      { name: 'abap', type: 'asx:AbapType' },
    ],
    complexType: [
      {
        name: 'AbapValuesType',
        sequence: {
          element: [
            { ref: 'asx:Schema', minOccurs: '0', maxOccurs: 'unbounded' },
          ],
        },
      },
      {
        name: 'AbapType',
        sequence: {
          element: [{ name: 'values', type: 'asx:AbapValuesType' }],
        },
        attribute: [{ name: 'version', type: 'xs:string' }],
      },
    ],
  };

  // Simulates doma.xsd - defines elements that substitute asx:Schema
  const domaSchema: Schema = {
    targetNamespace: undefined, // No namespace, uses default
    elementFormDefault: 'qualified',
    $imports: [asxSchema],
    $xmlns: {
      asx: 'http://www.sap.com/abapxml',
      xs: 'http://www.w3.org/2001/XMLSchema',
    },
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
        all: {
          element: [
            { name: 'DOMNAME', type: 'xs:string' },
            { name: 'DDTEXT', type: 'xs:string', minOccurs: '0' },
          ],
        },
      },
      {
        name: 'Dd07vTabType',
        sequence: {
          element: [
            {
              name: 'DD07V',
              type: 'Dd07vType',
              minOccurs: '0',
              maxOccurs: 'unbounded',
            },
          ],
        },
      },
      {
        name: 'Dd07vType',
        all: {
          element: [
            { name: 'VALPOS', type: 'xs:string', minOccurs: '0' },
            { name: 'DDTEXT', type: 'xs:string', minOccurs: '0' },
          ],
        },
      },
    ],
  };

  it('should generate types for all complexTypes', () => {
    // Merge schemas to resolve substitution groups
    const merged = resolveSchema(domaSchema);
    const { code: result } = generateInterfaces(merged);

    // Should have Dd01vType
    assert.ok(
      result.includes('export interface Dd01vType'),
      'Should have Dd01vType',
    );
    assert.ok(
      result.includes('DOMNAME: string'),
      'Should have DOMNAME property',
    );

    // Should have Dd07vTabType
    assert.ok(
      result.includes('export interface Dd07vTabType'),
      'Should have Dd07vTabType',
    );
    assert.ok(
      result.includes('DD07V?: Dd07vType[]'),
      'Should have DD07V array property',
    );

    // Should have Dd07vType
    assert.ok(
      result.includes('export interface Dd07vType'),
      'Should have Dd07vType',
    );
  });

  it('should expand substitution groups in AbapValuesType', () => {
    // Merge schemas to resolve substitution groups
    const merged = resolveSchema(domaSchema);
    const { code: result } = generateInterfaces(merged);

    // AbapValuesType should have DD01V and DD07V_TAB (substitutes for abstract Schema)
    // instead of the abstract Schema element
    assert.ok(
      result.includes('export interface AbapValuesType'),
      'Should have AbapValuesType',
    );
    assert.ok(
      result.includes('DD01V?: Dd01vType[]'),
      'Should have DD01V substitute',
    );
    assert.ok(
      result.includes('DD07V_TAB?: Dd07vTabType[]'),
      'Should have DD07V_TAB substitute',
    );
  });
});
