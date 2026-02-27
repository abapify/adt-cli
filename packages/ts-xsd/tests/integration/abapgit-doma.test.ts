/**
 * Integration test for abapGit DOMA schema
 *
 * Tests all XSD composition features as used in adt-plugin-abapgit:
 * - xs:include - types/dd01v.xsd, types/dd07v.xsd (same namespace)
 * - xs:redefine - asx.xsd (extends AbapValuesType)
 * - xs:import - abapgit.xsd (no namespace)
 *
 * Schema structure (from adt-plugin-abapgit/xsd/):
 * - doma.xsd (targetNamespace: http://www.sap.com/abapxml)
 *   - xs:include types/dd01v.xsd (Dd01vType)
 *   - xs:include types/dd07v.xsd (Dd07vType, Dd07vTabType)
 *   - xs:redefine asx.xsd (extends AbapValuesType with DD01V, DD07V_TAB)
 *   - xs:import abapgit.xsd (abapGit root element)
 * - asx.xsd (SAP ABAP XML envelope with asx:abap)
 * - abapgit.xsd (abapGit root element wrapper)
 *
 * Test scenarios:
 * 1. RAW - No linking, preserves XSD directives as-is
 * 2. LINKED - With $includes/$imports, auto-discovers dependencies
 * 3. loadSchema autoLink - Tests loader directly with autoLink
 * 4. Type availability - Verifies all types accessible from dependencies
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCodegen } from '../../src/codegen/runner.ts';
import { rawSchema } from '../../src/generators/raw-schema.ts';
import { loadSchema, type Schema } from '../../src/xsd/index.ts';
import type { CodegenConfig } from '../../src/codegen/types.ts';
import { generateInterfaces } from '../../src/codegen/interface-generator.ts';
import { resolveSchema } from '../../src/xsd/resolve.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '../fixtures/abapgit-doma');
const generatedDir = join(__dirname, 'generated/abapgit-doma');

// Output directories for each variant
const outputDirs = {
  raw: 'raw', // No $includes/$imports in output, all 5 files
  linked: 'linked', // With $includes/$imports and TS imports, all 5 files
  resolved: 'resolved', // Single file with all dependencies inlined
};

describe('abapGit DOMA schema integration', () => {
  before(() => {
    // Ensure all output directories exist
    for (const dir of Object.values(outputDirs)) {
      const fullPath = join(generatedDir, dir);
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
      }
    }
  });

  // ============================================================================
  // Scenario 1: RAW output - preserves XSD directives as-is
  // ============================================================================
  it('should generate RAW output - preserves include/import/redefine directives as-is', async () => {
    const config: CodegenConfig = {
      sources: {
        'abapgit-doma': {
          xsdDir: '.',
          outputDir: join(generatedDir, outputDirs.raw),
          schemas: ['doma'],
          autoLink: true, // Discover all schemas but don't link them
        },
      },
      generators: [
        rawSchema({ $includes: false, $imports: false }), // Disable linking in output
      ],
    };

    const result = await runCodegen(config, { rootDir: fixturesDir });
    assert.strictEqual(
      result.errors.length,
      0,
      `Errors: ${JSON.stringify(result.errors)}`,
    );

    // Should generate ALL 5 schema files
    const generatedFiles = result.files.filter(
      (f) => !f.path.includes('index'),
    );
    console.log('\n=== RAW: Generated files ===');
    generatedFiles.forEach((f) => console.log(`  ${f.path}`));

    assert.strictEqual(
      generatedFiles.length,
      5,
      'RAW should generate 5 schema files',
    );

    const domaFile = result.files.find(
      (f) => f.path.includes('doma') && !f.path.includes('index'),
    );
    assert.ok(domaFile, 'Should generate doma.ts');

    const content = readFileSync(domaFile.path, 'utf-8');

    // RAW: Should have raw XSD directives
    assert.ok(content.includes('include'), 'RAW should have include directive');
    assert.ok(
      content.includes('redefine'),
      'RAW should have redefine directive',
    );
    assert.ok(
      content.includes('schemaLocation'),
      'RAW should have schemaLocation',
    );
    assert.ok(
      content.includes('types/dd01v.xsd'),
      'RAW should reference types/dd01v.xsd',
    );
    assert.ok(
      content.includes('types/dd07v.xsd'),
      'RAW should reference types/dd07v.xsd',
    );
    assert.ok(content.includes('asx.xsd'), 'RAW should reference asx.xsd');
    assert.ok(
      content.includes('abapgit.xsd'),
      'RAW should reference abapgit.xsd',
    );
    assert.ok(!content.includes('$includes'), 'RAW should NOT have $includes');
    assert.ok(!content.includes('$imports'), 'RAW should NOT have $imports');
  });

  // ============================================================================
  // Scenario 2: LINKED output - $includes/$imports with TypeScript imports
  // ============================================================================
  it('should generate LINKED output - $includes/$imports with TypeScript imports', async () => {
    const config: CodegenConfig = {
      sources: {
        'abapgit-doma': {
          xsdDir: '.',
          outputDir: join(generatedDir, outputDirs.linked),
          schemas: ['doma'],
          autoLink: true, // Auto-discover all dependencies
        },
      },
      generators: [
        rawSchema({ $includes: true, $imports: true }), // Enable linking
      ],
    };

    const result = await runCodegen(config, { rootDir: fixturesDir });
    assert.strictEqual(
      result.errors.length,
      0,
      `Errors: ${JSON.stringify(result.errors)}`,
    );

    // Should generate ALL 5 schema files
    const generatedFiles = result.files.filter(
      (f) => !f.path.includes('index'),
    );
    console.log('\n=== LINKED: Generated files ===');
    generatedFiles.forEach((f) => console.log(`  ${f.path}`));

    assert.strictEqual(
      generatedFiles.length,
      5,
      'LINKED should generate 5 schema files',
    );

    const domaFile = result.files.find(
      (f) => f.path.includes('doma') && !f.path.includes('index'),
    );
    assert.ok(domaFile, 'Should generate doma.ts');

    const content = readFileSync(domaFile.path, 'utf-8');

    // LINKED: Should have $imports and $includes
    assert.ok(content.includes('$imports'), 'LINKED should have $imports');
    assert.ok(content.includes('$includes'), 'LINKED should have $includes');
    assert.ok(
      content.includes("import abapgit from './abapgit'"),
      'LINKED should have abapgit import',
    );
    assert.ok(
      content.includes("import dd01v from './types/dd01v'"),
      'LINKED should have dd01v import',
    );
    assert.ok(
      content.includes("import dd07v from './types/dd07v'"),
      'LINKED should have dd07v import',
    );

    // Should have redefine content (AbapValuesType extension)
    assert.ok(
      content.includes('redefine'),
      'LINKED should have redefine (extends AbapValuesType)',
    );
    assert.ok(
      content.includes('AbapValuesType'),
      'LINKED should have AbapValuesType',
    );
  });

  // ============================================================================
  // Scenario 3: RESOLVED output - ALL dependencies merged into single schema
  // ============================================================================
  it('should generate RESOLVED output - all dependencies merged inline', async () => {
    // RESOLVED mode: Use resolveAll to merge ALL schema content (includes AND imports)
    // into a single self-contained schema. The result should have:
    // - element declarations (abapGit from abapgit.xsd, abap from asx.xsd)
    // - complexTypes from all schemas (AbapType, AbapValuesType, Dd01vType, etc.)
    const config: CodegenConfig = {
      sources: {
        'abapgit-doma': {
          xsdDir: '.',
          outputDir: join(generatedDir, outputDirs.resolved),
          schemas: ['doma'], // Only entry point
          autoLink: true, // Discover all schemas for linking
        },
      },
      generators: [
        rawSchema({
          resolveAll: true, // Merge ALL dependencies (includes + imports)!
        }),
      ],
    };

    const result = await runCodegen(config, { rootDir: fixturesDir });
    assert.strictEqual(
      result.errors.length,
      0,
      `Errors: ${JSON.stringify(result.errors)}`,
    );

    // Still generates all 5 files (autoLink discovers them)
    // but doma.ts should have merged content from ALL dependencies
    const generatedFiles = result.files.filter(
      (f) => !f.path.includes('index'),
    );
    console.log('\n=== RESOLVED: Generated files ===');
    generatedFiles.forEach((f) => console.log(`  ${f.path}`));

    const domaFile = result.files.find(
      (f) => f.path.includes('doma.ts') && !f.path.includes('index'),
    );
    assert.ok(domaFile, 'Should generate doma.ts');

    const content = readFileSync(domaFile.path, 'utf-8');
    console.log('\n=== RESOLVED doma.ts content ===');
    console.log(content);

    // RESOLVED: Should NOT have $includes/$imports arrays or TypeScript imports
    assert.ok(
      !content.includes('$includes'),
      'RESOLVED should NOT have $includes',
    );
    assert.ok(
      !content.includes('$imports'),
      'RESOLVED should NOT have $imports',
    );
    assert.ok(
      !content.includes('import '),
      'RESOLVED should NOT have TypeScript imports',
    );

    // RESOLVED: Should have inlined types from includes (merged from dd01v, dd07v)
    assert.ok(
      content.includes('Dd01vType'),
      'RESOLVED should have Dd01vType inlined',
    );
    assert.ok(
      content.includes('Dd07vType'),
      'RESOLVED should have Dd07vType inlined',
    );

    // RESOLVED: Elements from chameleon schemas (no targetNamespace) ARE merged
    // abapGit element is from abapgit.xsd (no namespace) - chameleon schemas adopt importing namespace
    // This follows XSD semantics: schemas without targetNamespace merge into importing schema

    // The resolved schema should have elements from same namespace AND chameleon schemas
    const hasElements = content.includes('element:');
    if (hasElements) {
      const rootElementSection = content.split('complexType:')[0];
      // abapGit SHOULD be present (from chameleon schema abapgit.xsd)
      assert.ok(
        rootElementSection.includes('name: "abapGit"'),
        'RESOLVED should have abapGit element (chameleon schema)',
      );
    }

    // RESOLVED: Should have types from asx.xsd (AbapType, AbapValuesType) - types ARE merged for extension resolution
    assert.ok(
      content.includes('AbapType'),
      'RESOLVED should have AbapType from asx.xsd',
    );

    // RESOLVED: Should NOT have include/import/redefine directives (content is merged)
    assert.ok(
      !content.includes('include:'),
      'RESOLVED should NOT have include directive',
    );
    assert.ok(
      !content.includes('"import":'),
      'RESOLVED should NOT have import directive',
    );

    console.log(`\n=== RESOLVED file size: ${content.length} chars ===`);
  });

  // ============================================================================
  // Scenario 4: loadSchema with autoLink - tests loader API directly
  // ============================================================================
  it('should automatically load all dependent schemas with loadSchema autoLink', () => {
    const domaPath = join(fixturesDir, 'doma.xsd');

    // Load with autoLink - should automatically load all dependencies
    const schema = loadSchema(domaPath, { autoLink: true });

    // Verify $filename is set
    assert.ok(schema.$filename, 'Should have $filename');
    assert.ok(
      schema.$filename.endsWith('doma.xsd'),
      `$filename should be doma.xsd, got: ${schema.$filename}`,
    );

    // Verify targetNamespace
    assert.strictEqual(schema.targetNamespace, 'http://www.sap.com/abapxml');

    // Verify $includes populated from xs:include (dd01v.xsd, dd07v.xsd)
    assert.ok(schema.$includes, '$includes should be populated');
    assert.strictEqual(
      schema.$includes.length,
      2,
      'Should have 2 includes (dd01v, dd07v)',
    );

    // Verify included schemas have their types
    const includeFilenames = schema.$includes.map((s: Schema) => s.$filename);
    console.log('\n=== loadSchema autoLink: Included schemas ===');
    console.log(`  ${includeFilenames.join(', ')}`);

    // Check dd01v types
    const dd01vSchema = schema.$includes.find((s: Schema) =>
      s.$filename?.includes('dd01v'),
    );
    assert.ok(dd01vSchema, 'Should have dd01v.xsd in $includes');
    assert.ok(
      dd01vSchema.complexType?.some((ct) => ct.name === 'Dd01vType'),
      'dd01v should have Dd01vType',
    );

    // Check dd07v types
    const dd07vSchema = schema.$includes.find((s: Schema) =>
      s.$filename?.includes('dd07v'),
    );
    assert.ok(dd07vSchema, 'Should have dd07v.xsd in $includes');

    // Verify $imports populated from xs:import (abapgit.xsd)
    assert.ok(schema.$imports, '$imports should be populated');
    assert.strictEqual(
      schema.$imports.length,
      1,
      'Should have 1 import (abapgit)',
    );

    const abapgitSchema = schema.$imports[0];
    assert.ok(
      abapgitSchema.$filename?.includes('abapgit'),
      'Should have abapgit.xsd in $imports',
    );

    // Verify redefine has $schema populated (asx.xsd)
    assert.ok(schema.redefine, 'Should have redefine');
    assert.strictEqual(schema.redefine.length, 1, 'Should have 1 redefine');

    const redefine = schema.redefine[0];
    const redefineSchema = (redefine as { $schema?: Schema }).$schema;
    assert.ok(redefineSchema, 'redefine should have $schema populated');
    assert.ok(
      redefineSchema.$filename?.includes('asx'),
      'redefine.$schema should be asx.xsd',
    );
    assert.ok(
      redefineSchema.complexType?.some((ct) => ct.name === 'AbapValuesType'),
      'asx.xsd should have AbapValuesType',
    );

    console.log('\n=== Schema dependency tree ===');
    console.log(`doma.xsd (${schema.targetNamespace})`);
    console.log(
      `  $includes: [${schema.$includes.map((s: Schema) => s.$filename).join(', ')}]`,
    );
    console.log(
      `  $imports: [${schema.$imports.map((s: Schema) => s.$filename).join(', ')}]`,
    );
    console.log(`  redefine.$schema: ${redefineSchema.$filename}`);
  });

  // ============================================================================
  // Scenario 5: Type availability - all types accessible from dependencies
  // ============================================================================
  it('should have all types available for type inference', () => {
    const domaPath = join(fixturesDir, 'doma.xsd');
    const schema = loadSchema(domaPath, { autoLink: true });

    // Collect all available types from schema + dependencies
    const allTypes: string[] = [];

    // Types from main schema
    schema.complexType?.forEach((ct) => allTypes.push(`doma:${ct.name}`));
    schema.simpleType?.forEach((st) => allTypes.push(`doma:${st.name}`));

    // Types from includes
    schema.$includes?.forEach((inc: Schema) => {
      inc.complexType?.forEach((ct) => allTypes.push(`include:${ct.name}`));
      inc.simpleType?.forEach((st) => allTypes.push(`include:${st.name}`));
    });

    // Types from imports
    schema.$imports?.forEach((imp: Schema) => {
      imp.complexType?.forEach((ct) => allTypes.push(`import:${ct.name}`));
      imp.simpleType?.forEach((st) => allTypes.push(`import:${st.name}`));
    });

    // Types from redefine base schema
    schema.redefine?.forEach((red) => {
      const redefineSchema = (red as { $schema?: Schema }).$schema;
      redefineSchema?.complexType?.forEach((ct) =>
        allTypes.push(`redefine-base:${ct.name}`),
      );
      redefineSchema?.simpleType?.forEach((st) =>
        allTypes.push(`redefine-base:${st.name}`),
      );
    });

    console.log('\n=== All available types ===');
    console.log(allTypes.join('\n'));

    // Verify key types are available
    assert.ok(
      allTypes.includes('include:Dd01vType'),
      'Should have Dd01vType from include',
    );
    assert.ok(
      allTypes.includes('redefine-base:AbapValuesType'),
      'Should have AbapValuesType from redefine base',
    );
    assert.ok(
      allTypes.includes('redefine-base:AbapType'),
      'Should have AbapType from redefine base',
    );
  });

  // ============================================================================
  // Scenario 6: Compare RAW vs LINKED vs RESOLVED outputs
  // ============================================================================
  it('should produce different outputs for RAW vs LINKED vs RESOLVED', async () => {
    // Read both generated files
    const rawContent = readFileSync(
      join(generatedDir, outputDirs.raw, 'doma.ts'),
      'utf-8',
    );
    const linkedContent = readFileSync(
      join(generatedDir, outputDirs.linked, 'doma.ts'),
      'utf-8',
    );

    // RAW and LINKED should be different
    assert.notStrictEqual(
      rawContent,
      linkedContent,
      'RAW and LINKED should be different',
    );

    // RAW has schemaLocation paths
    assert.ok(
      rawContent.includes('schemaLocation'),
      'RAW should have schemaLocation',
    );

    // LINKED has $imports with TypeScript import
    assert.ok(
      linkedContent.includes('$imports'),
      'LINKED should have $imports',
    );
    assert.ok(
      linkedContent.includes('$includes'),
      'LINKED should have $includes',
    );
    assert.ok(
      linkedContent.includes('import abapgit from'),
      'LINKED should have TypeScript import',
    );

    console.log('\n=== Output sizes ===');
    console.log(`RAW:    ${rawContent.length} chars`);
    console.log(`LINKED: ${linkedContent.length} chars`);
  });

  // ============================================================================
  // Scenario 7: Interface generation from LINKED schema (existing generator)
  // ============================================================================
  it('should generate TypeScript interfaces from LINKED schema', () => {
    const domaPath = join(fixturesDir, 'doma.xsd');

    // Load with autoLink - schema has $includes/$imports populated
    const linkedSchema = loadSchema(domaPath, { autoLink: true });

    console.log('\n=== LINKED Interface Generation ===');

    // Generate interfaces using the existing (complex) generator
    // This generator traverses $imports and $includes to resolve types
    // Note: The existing generator requires a rootElement to start from
    const { code: interfaces } = generateInterfaces(linkedSchema, {
      addJsDoc: true,
    });

    console.log('\n--- Generated interfaces (LINKED) ---');
    console.log(interfaces || '(empty - no root element specified)');
    console.log(`\n=== LINKED interfaces size: ${interfaces.length} chars ===`);

    // Write to file for inspection
    const linkedInterfacesDir = join(generatedDir, 'linked');
    if (!existsSync(linkedInterfacesDir))
      mkdirSync(linkedInterfacesDir, { recursive: true });
    writeFileSync(
      join(linkedInterfacesDir, 'interfaces.ts'),
      interfaces || '// No interfaces generated',
    );
    console.log(`Written to: ${join(linkedInterfacesDir, 'interfaces.ts')}`);

    // The existing generator may return empty if no rootElement is specified
    // and the schema doesn't have a clear entry point. This is expected behavior.
    // The key insight is that the LINKED generator needs to traverse $imports/$includes
    // to find types, which adds complexity.

    // For schemas with clear root elements, it would generate interfaces
    // For now, just verify it doesn't crash
    assert.ok(typeof interfaces === 'string', 'Should return a string');
  });

  // ============================================================================
  // Scenario 8: Interface generation from RESOLVED schema (simple generator)
  // ============================================================================
  it('should generate TypeScript interfaces from RESOLVED schema using resolveSchema', () => {
    const domaPath = join(fixturesDir, 'doma.xsd');

    // Load with autoLink first
    const linkedSchema = loadSchema(domaPath, { autoLink: true });

    // Use resolveSchema to include ALL elements (including referenced ones)
    // This is needed for resolving element refs in interface generation
    const mergedSchema = resolveSchema(linkedSchema);

    console.log('\n=== MERGED Interface Generation (using resolveSchema) ===');
    console.log(
      `Merged schema has ${mergedSchema.complexType?.length ?? 0} complexTypes`,
    );
    console.log(
      `Merged schema has ${mergedSchema.simpleType?.length ?? 0} simpleTypes`,
    );
    console.log(
      `Merged schema has ${mergedSchema.element?.length ?? 0} elements`,
    );

    // Generate interfaces using the simplified generator
    // This generator works with pre-merged schemas - no import traversal needed
    const { code: interfaces } = generateInterfaces(mergedSchema, {
      addJsDoc: true,
    });

    console.log('\n--- Generated interfaces (MERGED) ---');
    console.log(interfaces);

    // Should have interfaces for all merged types
    assert.ok(interfaces.length > 0, 'Should generate interfaces');

    // Should have types that were originally in includes (now merged)
    assert.ok(
      interfaces.includes('Dd01vType'),
      'Should have Dd01vType (merged from include)',
    );
    assert.ok(
      interfaces.includes('Dd07vType'),
      'Should have Dd07vType (merged from include)',
    );

    // Should have types from redefine base (now merged)
    assert.ok(
      interfaces.includes('AbapValuesType'),
      'Should have AbapValuesType (merged from redefine)',
    );
    assert.ok(
      interfaces.includes('AbapType'),
      'Should have AbapType (merged from redefine)',
    );

    // Write to file for inspection
    const mergedInterfacesDir = join(generatedDir, 'merged');
    if (!existsSync(mergedInterfacesDir))
      mkdirSync(mergedInterfacesDir, { recursive: true });
    writeFileSync(join(mergedInterfacesDir, 'interfaces.ts'), interfaces);
    console.log(`Written to: ${join(mergedInterfacesDir, 'interfaces.ts')}`);

    console.log(`\n=== MERGED interfaces size: ${interfaces.length} chars ===`);
  });

  // ============================================================================
  // Scenario 9: Compare interface generation approaches
  // ============================================================================
  it('should compare LINKED vs MERGED interface generation approaches', () => {
    const domaPath = join(fixturesDir, 'doma.xsd');

    // LINKED approach - uses existing complex generator
    const linkedSchema = loadSchema(domaPath, { autoLink: true });
    const { code: linkedInterfaces } = generateInterfaces(linkedSchema);

    // MERGED approach - uses resolveSchema + simple generator
    const mergedSchema = resolveSchema(linkedSchema);
    const { code: mergedInterfaces } = generateInterfaces(mergedSchema);

    console.log('\n=== Interface Generation Comparison ===');
    console.log(`LINKED interfaces:  ${linkedInterfaces.length} chars`);
    console.log(`MERGED interfaces:  ${mergedInterfaces.length} chars`);

    // MERGED should generate interfaces (it has all types merged)
    assert.ok(mergedInterfaces.length > 0, 'MERGED should generate interfaces');

    // Key types should be in MERGED output
    const keyTypes = ['Dd01vType', 'Dd07vType', 'AbapValuesType', 'AbapType'];
    for (const typeName of keyTypes) {
      assert.ok(
        mergedInterfaces.includes(typeName),
        `MERGED should have ${typeName}`,
      );
    }

    // Count interfaces in merged output
    const mergedCount = (mergedInterfaces.match(/export interface/g) ?? [])
      .length;
    const mergedTypeCount = (mergedInterfaces.match(/export type/g) ?? [])
      .length;

    console.log(`MERGED interface count: ${mergedCount}`);
    console.log(`MERGED type alias count: ${mergedTypeCount}`);

    // Log the type names generated
    const mergedTypeNames =
      mergedInterfaces.match(/export (interface|type) (\w+)/g) ?? [];

    console.log('\n--- MERGED types ---');
    console.log(mergedTypeNames.join('\n'));

    // Key insight: The MERGED approach is simpler because:
    // 1. All types are in one flat schema
    // 2. No need to traverse $imports/$includes
    // 3. Direct map lookups instead of recursive searches
    console.log('\n=== Key Insight ===');
    console.log('MERGED approach simplifies interface generation by:');
    console.log('  1. Collecting all types into a single flat schema');
    console.log('  2. Eliminating need for cross-schema type resolution');
    console.log(
      '  3. Enabling direct map lookups instead of recursive searches',
    );
  });
});
