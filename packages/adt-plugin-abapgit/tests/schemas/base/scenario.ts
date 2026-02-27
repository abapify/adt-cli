/**
 * Test scenario base for abapGit schema tests
 *
 * Fixture-driven testing with full validation:
 * 1. Validate fixture XML against XSD using xmllint
 * 2. Parse XML fixture → typed TypeScript object
 * 3. Validate parsed content explicitly
 * 4. Build back to XML
 * 5. Round-trip: parse built XML and compare
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseXml, buildXml, type Schema, type SchemaLike } from 'ts-xsd';

// ESM-compatible __dirname for this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fixturesDir = join(__dirname, '../../fixtures');
const xsdDir = join(__dirname, '../../../xsd');

/** Load fixture from tests/fixtures directory */
export function loadFixture(relativePath: string): string {
  return readFileSync(join(fixturesDir, relativePath), 'utf-8');
}

/** Check if xmllint is available */
function isXmllintAvailable(): boolean {
  try {
    execSync('xmllint --version 2>&1', { encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}

const xmllintAvailable = isXmllintAvailable();

/** Validate XML file against XSD using xmllint */
export function validateXsd(
  fixturePath: string,
  xsdName: string,
): { valid: boolean; error?: string; skipped?: boolean } {
  if (!xmllintAvailable) {
    return { valid: true, skipped: true, error: 'xmllint not available' };
  }

  const xmlPath = join(fixturesDir, fixturePath);
  const xsdPath = join(xsdDir, `${xsdName}.xsd`);

  try {
    execSync(`xmllint --schema "${xsdPath}" "${xmlPath}" --noout 2>&1`, {
      encoding: 'utf-8',
    });
    return { valid: true };
  } catch (err) {
    const error = err as { stdout?: string; stderr?: string; message?: string };
    return {
      valid: false,
      error: error.stdout || error.stderr || error.message,
    };
  }
}

/** Typed schema with parse/build that returns concrete type T */
export interface TypedSchema<T> {
  parse(xml: string): T;
  build(data: T): string;
}

/** Create a typed schema wrapper - fully typed, no any/unknown */
export function createTypedSchema<T>(schema: SchemaLike): TypedSchema<T> {
  return {
    parse: (xml: string): T => parseXml(schema as Schema, xml) as T,
    build: (data: T): string => buildXml(schema as Schema, data),
  };
}

/** Fixture test definition */
export interface FixtureTest<T> {
  /** Path to fixture file relative to tests/fixtures/ */
  path: string;
  /** Validate the parsed data - must assert all expected values */
  validate: (data: T) => void;
}

/** Schema test scenario - fully typed */
export interface SchemaScenario<T> {
  /** Name for test output */
  name: string;
  /** XSD schema name (without .xsd extension) for xmllint validation */
  xsdName: string;
  /** The typed schema to test */
  schema: TypedSchema<T>;
  /** Fixtures to test with validation */
  fixtures: FixtureTest<T>[];
}

/**
 * Run fixture-driven schema tests:
 * 1. Validate fixture against XSD (xmllint)
 * 2. Parse fixture XML to typed object
 * 3. Validate parsed content
 * 4. Build back to XML
 * 5. Round-trip: parse built XML and compare
 */
export function runSchemaTests<T>(scenario: SchemaScenario<T>): void {
  describe(`${scenario.name} Schema`, () => {
    for (const fixture of scenario.fixtures) {
      describe(fixture.path, () => {
        let xml: string;
        let parsed: T;
        let built: string;
        let reparsed: T;
        let xsdValidation: {
          valid: boolean;
          error?: string;
          skipped?: boolean;
        };

        before(() => {
          // 1. Validate against XSD first
          xsdValidation = validateXsd(fixture.path, scenario.xsdName);

          // Only continue if XSD validation passes
          if (!xsdValidation.valid) return;

          // 2. Load and parse
          xml = loadFixture(fixture.path);
          try {
            parsed = scenario.schema.parse(xml);
          } catch (e) {
            console.error('Parse error:', e);
            return;
          }

          // 3. Build back to XML
          try {
            built = scenario.schema.build(parsed);
          } catch (e) {
            console.error('Build error:', e);
            return;
          }

          // 4. Parse again for round-trip
          try {
            reparsed = scenario.schema.parse(built);
          } catch (e) {
            console.error('Reparse error:', e);
          }
        });

        it('validates against XSD', (t) => {
          if (xsdValidation.skipped) {
            t.skip('xmllint not available');
            return;
          }
          assert.ok(
            xsdValidation.valid,
            `XSD validation failed: ${xsdValidation.error}`,
          );
        });

        it('parses fixture to typed object', () => {
          assert.ok(parsed !== null && parsed !== undefined);
        });

        it('validates parsed content', () => {
          fixture.validate(parsed);
        });

        it('builds back to XML', () => {
          assert.ok(built.length > 0);
          assert.ok(built.includes('<?xml') || built.includes('<'));
        });

        it('round-trips correctly', () => {
          // Compare reparsed with original parsed
          assert.deepStrictEqual(reparsed, parsed);
        });
      });
    }
  });
}
