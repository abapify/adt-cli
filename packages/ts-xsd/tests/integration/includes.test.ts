/**
 * Integration test for xs:include support
 *
 * Tests 3 variants of include handling:
 * 1. raw - preserves include directive as-is (no linking)
 * 2. linked - converts include to $includes with TypeScript imports
 * 3. resolved - merges included content directly (self-contained)
 *
 * Output directories:
 * - generated/raw/      - Raw include directive preserved
 * - generated/linked/   - $includes with imports
 * - generated/resolved/ - Merged content, no includes
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCodegen } from '../../src/codegen/runner.ts';
import { rawSchema } from '../../src/generators/raw-schema.ts';
import type { CodegenConfig } from '../../src/codegen/types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '../fixtures/includes');
const generatedDir = join(__dirname, 'generated/includes');

// Output directories for each variant (relative to fixturesDir for codegen, absolute for assertions)
const outputDirs = {
  raw: 'raw',
  linked: 'linked',
  resolved: 'resolved',
};

describe('xs:include integration', () => {
  before(() => {
    // Ensure all output directories exist
    for (const dir of Object.values(outputDirs)) {
      const fullPath = join(generatedDir, dir);
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
      }
    }
  });

  it('should generate RAW output - preserves include directive as-is', async () => {
    const config: CodegenConfig = {
      sources: {
        'includes-test': {
          xsdDir: '.',
          outputDir: join(generatedDir, outputDirs.raw),
          schemas: ['document', 'common'],
        },
      },
      generators: [
        rawSchema({ $includes: false }), // Disable $includes, keep raw include
      ],
    };

    const result = await runCodegen(config, { rootDir: fixturesDir });
    assert.strictEqual(
      result.errors.length,
      0,
      `Errors: ${JSON.stringify(result.errors)}`,
    );

    const documentFile = result.files.find(
      (f) => f.path.includes('document') && !f.path.includes('index'),
    );
    assert.ok(documentFile, 'Should generate document.ts');

    const content = readFileSync(documentFile.path, 'utf-8');

    // RAW: Should have include directive, NOT $includes
    assert.ok(
      content.includes('include:'),
      'RAW should have include: property',
    );
    assert.ok(
      content.includes('schemaLocation'),
      'RAW should have schemaLocation',
    );
    assert.ok(
      content.includes('common.xsd'),
      'RAW should reference common.xsd',
    );
    assert.ok(!content.includes('$includes'), 'RAW should NOT have $includes');
    assert.ok(
      !content.includes('import common'),
      'RAW should NOT have import statement',
    );
  });

  it('should generate LINKED output - $includes with TypeScript imports', async () => {
    const config: CodegenConfig = {
      sources: {
        'includes-test': {
          xsdDir: '.',
          outputDir: join(generatedDir, outputDirs.linked),
          schemas: ['document', 'common'],
        },
      },
      generators: [
        rawSchema({ $includes: true }), // Enable $includes (default)
      ],
    };

    const result = await runCodegen(config, { rootDir: fixturesDir });
    assert.strictEqual(
      result.errors.length,
      0,
      `Errors: ${JSON.stringify(result.errors)}`,
    );

    const documentFile = result.files.find(
      (f) => f.path.includes('document') && !f.path.includes('index'),
    );
    assert.ok(documentFile, 'Should generate document.ts');

    const content = readFileSync(documentFile.path, 'utf-8');

    // LINKED: Should have $includes and import, NOT raw include
    assert.ok(content.includes('$includes'), 'LINKED should have $includes');
    assert.ok(
      content.includes("import common from './common'"),
      'LINKED should have import statement',
    );
    assert.ok(
      !content.includes('include:'),
      'LINKED should NOT have include: property',
    );
    assert.ok(
      !content.includes('schemaLocation'),
      'LINKED should NOT have schemaLocation',
    );

    // Should have document's own content
    assert.ok(
      content.includes('DocumentType'),
      'LINKED should have DocumentType',
    );
    assert.ok(
      content.includes('substitutionGroup'),
      'LINKED should have substitutionGroup',
    );
  });

  it('should generate RESOLVED output - merged content, self-contained', async () => {
    const config: CodegenConfig = {
      sources: {
        'includes-test': {
          xsdDir: '.',
          outputDir: join(generatedDir, outputDirs.resolved),
          schemas: ['document', 'common'],
        },
      },
      generators: [
        rawSchema({ resolveIncludes: true }), // Merge includes
      ],
    };

    const result = await runCodegen(config, { rootDir: fixturesDir });
    assert.strictEqual(
      result.errors.length,
      0,
      `Errors: ${JSON.stringify(result.errors)}`,
    );

    const documentFile = result.files.find(
      (f) => f.path.includes('document') && !f.path.includes('index'),
    );
    assert.ok(documentFile, 'Should generate document.ts');

    const content = readFileSync(documentFile.path, 'utf-8');

    // RESOLVED: Should NOT have any include references
    assert.ok(
      !content.includes('$includes'),
      'RESOLVED should NOT have $includes',
    );
    assert.ok(
      !content.includes('include:'),
      'RESOLVED should NOT have include:',
    );
    assert.ok(
      !content.includes('import common'),
      'RESOLVED should NOT have import statement',
    );

    // RESOLVED: Should have MERGED content from common.xsd
    assert.ok(
      content.includes('wrapper'),
      'RESOLVED should have wrapper element from common.xsd',
    );
    assert.ok(
      content.includes('"content"'),
      'RESOLVED should have content element from common.xsd',
    );
    assert.ok(
      content.includes('MetadataType'),
      'RESOLVED should have MetadataType from common.xsd',
    );

    // RESOLVED: Should still have document's own content
    assert.ok(
      content.includes('DocumentType'),
      'RESOLVED should have DocumentType from document.xsd',
    );
    assert.ok(
      content.includes('"document"'),
      'RESOLVED should have document element',
    );
  });

  it('should produce different outputs for each variant', async () => {
    // Read all 3 generated files
    const rawContent = readFileSync(
      join(generatedDir, outputDirs.raw, 'document.ts'),
      'utf-8',
    );
    const linkedContent = readFileSync(
      join(generatedDir, outputDirs.linked, 'document.ts'),
      'utf-8',
    );
    const resolvedContent = readFileSync(
      join(generatedDir, outputDirs.resolved, 'document.ts'),
      'utf-8',
    );

    // All should be different
    assert.notStrictEqual(
      rawContent,
      linkedContent,
      'RAW and LINKED should be different',
    );
    assert.notStrictEqual(
      linkedContent,
      resolvedContent,
      'LINKED and RESOLVED should be different',
    );
    assert.notStrictEqual(
      rawContent,
      resolvedContent,
      'RAW and RESOLVED should be different',
    );

    // RESOLVED should be the longest (has merged content)
    assert.ok(
      resolvedContent.length > linkedContent.length,
      'RESOLVED should be longer than LINKED (merged content)',
    );
  });
});
