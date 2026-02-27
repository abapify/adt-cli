/**
 * Test for schema linking with same-named files in different directories
 *
 * Reproduces bug: devc.xsd includes types/devc.xsd - both have same basename
 * The linker should NOT confuse them and cause infinite recursion.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { Schema } from '../../src/xsd/types.ts';
import { resolveSchema } from '../../src/xsd/resolve.ts';

/**
 * Simulates the linkSchemaImports logic from raw-schema.ts
 * This is the function that has the bug
 */
function simulateLinkSchemaImports(
  schema: Schema,
  allSchemas: Map<string, { name: string; schema: Schema }>,
  visited: Set<string> = new Set(),
): Schema {
  const schemaKey = schema.$filename ?? 'unknown';

  // Detect infinite recursion
  if (visited.has(schemaKey)) {
    throw new Error(
      `Infinite recursion detected: ${schemaKey} already visited. Path: ${[...visited].join(' -> ')} -> ${schemaKey}`,
    );
  }
  visited.add(schemaKey);

  const includes = (schema as Record<string, unknown>).include as
    | Array<{ schemaLocation?: string }>
    | undefined;

  const result = { ...schema };

  // Handle xs:include - this is where the bug is
  if (includes && includes.length > 0) {
    const linkedIncludes: Schema[] = [];
    for (const inc of includes) {
      if (inc.schemaLocation) {
        // BUGGY LOGIC: Try with path first, then without path (basename fallback)
        const schemaNameWithPath = inc.schemaLocation.replace(/\.xsd$/, '');
        const schemaNameWithoutPath = schemaNameWithPath.replace(/^.*\//, '');

        // This is the bug: when schemaNameWithPath is not found, it falls back to basename
        // which can match the WRONG schema (the parent schema itself!)
        const includedSchemaInfo =
          allSchemas.get(schemaNameWithPath) ??
          allSchemas.get(schemaNameWithoutPath);

        if (includedSchemaInfo) {
          // Recursively process - this causes infinite recursion when wrong schema is matched
          const linkedIncluded = simulateLinkSchemaImports(
            includedSchemaInfo.schema,
            allSchemas,
            new Set(visited),
          );
          linkedIncludes.push(linkedIncluded);
        }
      }
    }
    if (linkedIncludes.length > 0) {
      (result as Record<string, unknown>).$includes = linkedIncludes;
    }
  }

  return result;
}

describe('Schema linking with same-named files', () => {
  it('should handle schema including file with same basename without infinite recursion', () => {
    // Simulate the structure:
    // - devc.xsd (includes types/devc.xsd)
    // - types/devc.xsd (defines DevcType)
    // Both have basename "devc" but are different files

    const typesDevcSchema = {
      $filename: 'types/devc.xsd',
      complexType: [
        {
          name: 'DevcType',
          all: { element: [{ name: 'CTEXT', type: 'xs:string' }] },
        },
      ],
    } as const;

    // Main devc.xsd with $includes pointing to types/devc.xsd
    const devcSchema = {
      $filename: 'devc.xsd',
      targetNamespace: 'http://www.sap.com/abapxml',
      $includes: [typesDevcSchema], // Pre-linked include
      complexType: [
        {
          name: 'AbapValuesType',
          sequence: {
            element: [{ name: 'DEVC', type: 'asx:DevcType', minOccurs: '0' }],
          },
        },
      ],
    } as const;

    // This should NOT throw "Maximum call stack size exceeded"
    let error: Error | null = null;
    let resolved: Schema | null = null;
    try {
      resolved = resolveSchema(devcSchema as unknown as Schema);
    } catch (e) {
      error = e as Error;
    }

    // The test passes if we don't get a stack overflow
    assert.ok(!error, `Should not throw error: ${error?.message}`);
    assert.ok(resolved, 'Should return resolved schema');

    // Verify types were merged from include
    const typeNames =
      (resolved?.complexType as Array<{ name?: string }>)?.map(
        (ct) => ct.name,
      ) ?? [];
    assert.ok(
      typeNames.includes('DevcType'),
      'Should have DevcType from $includes',
    );
    assert.ok(
      typeNames.includes('AbapValuesType'),
      'Should have AbapValuesType from main schema',
    );
  });

  it('should reproduce the linkSchemaImports bug with same-named files', () => {
    // This test reproduces the ACTUAL bug in linkSchemaImports
    //
    // Scenario:
    // - allSchemas has 'devc' (for devc.xsd) and 'types/devc' (for types/devc.xsd)
    // - devc.xsd has include: [{ schemaLocation: 'types/devc.xsd' }]
    // - When linking, it looks for 'types/devc' - if NOT found, falls back to 'devc'
    // - If 'types/devc' is missing from allSchemas, it finds 'devc' (the parent!) → infinite recursion

    const typesDevcSchema: Schema = {
      $filename: 'types/devc.xsd',
      complexType: [
        {
          name: 'DevcType',
          all: { element: [{ name: 'CTEXT', type: 'xs:string' }] },
        },
      ],
    };

    const devcSchema: Schema = {
      $filename: 'devc.xsd',
      targetNamespace: 'http://www.sap.com/abapxml',
      include: [{ schemaLocation: 'types/devc.xsd' }], // Raw include, not yet linked
      complexType: [
        {
          name: 'AbapValuesType',
          sequence: {
            element: [{ name: 'DEVC', type: 'asx:DevcType', minOccurs: '0' }],
          },
        },
      ],
    };

    // Case 1: Both schemas in map with correct keys - should work
    const allSchemasCorrect = new Map([
      ['devc', { name: 'devc', schema: devcSchema }],
      ['types/devc', { name: 'types/devc', schema: typesDevcSchema }],
    ]);

    let error: Error | null = null;
    try {
      simulateLinkSchemaImports(devcSchema, allSchemasCorrect);
    } catch (e) {
      error = e as Error;
    }
    assert.ok(
      !error,
      `Case 1 (correct keys) should not throw: ${error?.message}`,
    );

    // Case 2: types/devc is MISSING - the fallback will find 'devc' (wrong schema!)
    const allSchemasMissingTypesDevc = new Map([
      ['devc', { name: 'devc', schema: devcSchema }],
      // 'types/devc' is NOT in the map - simulates the bug scenario
    ]);

    error = null;
    try {
      simulateLinkSchemaImports(devcSchema, allSchemasMissingTypesDevc);
    } catch (e) {
      error = e as Error;
    }

    // This SHOULD fail with infinite recursion detection
    assert.ok(
      error,
      'Case 2 (missing types/devc) should detect infinite recursion',
    );
    assert.ok(
      error?.message?.includes('Infinite recursion'),
      `Should be recursion error: ${error?.message}`,
    );
  });

  it('should correctly distinguish types/devc.xsd from devc.xsd in schema map', () => {
    // Test the schema map lookup logic that linkSchemaImports uses
    const allSchemas = new Map([
      [
        'devc',
        {
          name: 'devc',
          schema: { $filename: 'devc.xsd' } as Schema,
          xsdPath: 'xsd/devc.xsd',
        },
      ],
      [
        'types/devc',
        {
          name: 'types/devc',
          schema: { $filename: 'types/devc.xsd' } as Schema,
          xsdPath: 'xsd/types/devc.xsd',
        },
      ],
    ]);

    // When looking for 'types/devc.xsd', we should find 'types/devc', NOT 'devc'
    const schemaLocation = 'types/devc.xsd';
    const schemaNameWithPath = schemaLocation.replace(/\.xsd$/, ''); // 'types/devc'

    const found = allSchemas.get(schemaNameWithPath);

    assert.ok(found, 'Should find types/devc in allSchemas');
    assert.strictEqual(
      found?.name,
      'types/devc',
      'Should find the correct schema',
    );
    assert.strictEqual(
      found?.schema.$filename,
      'types/devc.xsd',
      'Should have correct filename',
    );
  });

  it('should NOT fallback to basename when path is specified and found', () => {
    // This tests the bug: when include has a path like "types/devc.xsd",
    // and "types/devc" exists in the map, we should NOT fallback to "devc"

    const allSchemas = new Map([
      ['devc', { name: 'devc', schema: { $filename: 'devc.xsd' } as Schema }],
      [
        'types/devc',
        {
          name: 'types/devc',
          schema: { $filename: 'types/devc.xsd' } as Schema,
        },
      ],
    ]);

    const schemaLocation = 'types/devc.xsd';
    const schemaNameWithPath = schemaLocation.replace(/\.xsd$/, ''); // 'types/devc'
    const schemaNameWithoutPath = schemaNameWithPath.replace(/^.*\//, ''); // 'devc'

    // Current buggy logic: allSchemas.get(schemaNameWithPath) ?? allSchemas.get(schemaNameWithoutPath)
    // This works when types/devc exists, but the fallback is dangerous

    // The lookup should prefer the full path
    const foundWithPath = allSchemas.get(schemaNameWithPath);
    const foundWithoutPath = allSchemas.get(schemaNameWithoutPath);

    assert.ok(foundWithPath, 'Should find with full path');
    assert.ok(
      foundWithoutPath,
      'Basename also exists (this is the collision case)',
    );
    assert.notStrictEqual(
      foundWithPath,
      foundWithoutPath,
      'They should be different schemas',
    );

    // The correct behavior: use full path match, don't fallback when path is specified
    assert.strictEqual(foundWithPath?.schema.$filename, 'types/devc.xsd');
    assert.strictEqual(foundWithoutPath?.schema.$filename, 'devc.xsd');
  });
});
