/**
 * Test for DEVC (Development Class/Package) schema
 *
 * Fixture-driven: parses XML, validates content, round-trips
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  checkSchemaFixture,
  createTypedSchema,
  extractAbapGitRoot,
  type SchemaScenario,
} from './base/scenario.ts';
import { devc as devcSchema } from '../../src/schemas/generated/schemas/index.ts';
import type { DevcSchema } from '../../src/schemas/generated/types/devc.ts';

const schema = createTypedSchema<DevcSchema>(devcSchema);

const scenario: SchemaScenario<DevcSchema> = {
  name: 'DEVC',
  xsdName: 'devc',
  schema,
  fixtures: [
    {
      path: 'devc/package.devc.xml',
      validate: (data) => {
        // Schema is union type - assert to the abapGit variant
        const root = extractAbapGitRoot(data);

        // Envelope attributes
        assert.strictEqual(root.version, 'v1.0.0');
        assert.strictEqual(root.serializer, 'LCL_OBJECT_DEVC');
        assert.strictEqual(root.serializer_version, 'v1.0.0');

        // asx:abap
        assert.strictEqual(root.abap.version, '1.0');

        // DEVC content
        const devc = root.abap.values.DEVC!;
        assert.strictEqual(devc.CTEXT, 'Classes');
      },
    },
  ],
};

// Declare fixture tests literally so static test discovery sees them
describe('DEVC Schema', () => {
  for (const fixture of scenario.fixtures) {
    it(fixture.path, (t) => {
      checkSchemaFixture(scenario, fixture, t);
    });
  }
});
