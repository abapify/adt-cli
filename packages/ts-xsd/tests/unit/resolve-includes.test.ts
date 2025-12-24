/**
 * Test $includes support in resolver
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveSchema } from '../../src/xsd/resolve.ts';
import type { Schema } from '../../src/xsd/types';

describe('resolveSchema with $includes', () => {
  // Schema with $includes (simulating xs:include - same namespace)
  const includedSchema = {
    element: [
      {
        name: 'abapGit',
        complexType: { attribute: [{ name: 'version', type: 'xs:string' }] },
      },
    ],
    complexType: [
      {
        name: 'IncludedType',
        sequence: { element: [{ name: 'field1', type: 'xs:string' }] },
      },
    ],
  } as const;

  // Schema with $imports (simulating xs:import - different namespace)
  const importedSchema = {
    element: [
      { name: 'abap', type: 'AbapType' },
      { name: 'Schema', abstract: true },
    ],
    complexType: [
      {
        name: 'AbapType',
        sequence: { element: [{ name: 'values', type: 'ValuesType' }] },
      },
      {
        name: 'ValuesType',
        sequence: {
          element: [
            {
              name: 'DATA',
              type: 'xs:string',
              minOccurs: '0',
              maxOccurs: 'unbounded',
            },
          ],
        },
      },
    ],
  } as const;

  const mainSchema = {
    $includes: [includedSchema], // xs:include - same namespace
    $imports: [importedSchema], // xs:import - different namespace
    element: [
      {
        name: 'VSEOINTERF',
        type: 'VseoInterfType',
        substitutionGroup: 'asx:Schema',
      },
    ],
    complexType: [
      {
        name: 'VseoInterfType',
        all: { element: [{ name: 'CLSNAME', type: 'xs:string' }] },
      },
    ],
  } as const;

  it('should include elements from $includes in resolved schema', () => {
    const resolved = resolveSchema(mainSchema as unknown as Schema);
    const elementNames =
      (resolved.element as Array<{ name?: string }>)?.map((e) => e.name) ?? [];

    assert.ok(elementNames.includes('VSEOINTERF'), 'Should have VSEOINTERF');
    assert.ok(
      elementNames.includes('abapGit'),
      'Should have abapGit from $includes',
    );
    assert.ok(elementNames.includes('abap'), 'Should have abap from $imports');
  });

  it('should include complexTypes from $includes in resolved schema', () => {
    const resolved = resolveSchema(mainSchema as unknown as Schema);
    const typeNames =
      (resolved.complexType as Array<{ name?: string }>)?.map(
        (ct) => ct.name,
      ) ?? [];

    assert.ok(
      typeNames.includes('VseoInterfType'),
      'Should have VseoInterfType',
    );
    assert.ok(
      typeNames.includes('IncludedType'),
      'Should have IncludedType from $includes',
    );
    assert.ok(
      typeNames.includes('AbapType'),
      'Should have AbapType from $imports',
    );
  });

  it('should handle nested $includes', () => {
    const nestedInclude = {
      complexType: [
        {
          name: 'NestedType',
          sequence: { element: [{ name: 'nested', type: 'xs:string' }] },
        },
      ],
    } as const;

    const firstInclude = {
      $includes: [nestedInclude],
      complexType: [
        {
          name: 'FirstType',
          sequence: { element: [{ name: 'first', type: 'xs:string' }] },
        },
      ],
    } as const;

    const schema = {
      $includes: [firstInclude],
      complexType: [
        {
          name: 'MainType',
          sequence: { element: [{ name: 'main', type: 'xs:string' }] },
        },
      ],
    } as const;

    const resolved = resolveSchema(schema as unknown as Schema);
    const typeNames =
      (resolved.complexType as Array<{ name?: string }>)?.map(
        (ct) => ct.name,
      ) ?? [];

    assert.ok(typeNames.includes('MainType'), 'Should have MainType');
    assert.ok(
      typeNames.includes('FirstType'),
      'Should have FirstType from first $includes',
    );
    assert.ok(
      typeNames.includes('NestedType'),
      'Should have NestedType from nested $includes',
    );
  });
});
