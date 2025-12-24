/**
 * Test for INTF (Interface) schema
 *
 * Fixture-driven: parses XML, validates content, round-trips
 */

import assert from 'node:assert';
import {
  runSchemaTests,
  createTypedSchema,
  type SchemaScenario,
} from './base/scenario.ts';
import { intf as intfSchema } from '../../src/schemas/generated/schemas/index.ts';
import type { IntfSchema } from '../../src/schemas/generated/types/intf.ts';

const schema = createTypedSchema<IntfSchema>(intfSchema);

const scenario: SchemaScenario<IntfSchema> = {
  name: 'INTF',
  xsdName: 'intf',
  schema,
  fixtures: [
    {
      path: 'intf/zif_age_test.intf.xml',
      validate: (data) => {
        // Schema is union type - assert to the abapGit variant
        const root = (data as any).abapGit;

        // Envelope
        assert.strictEqual(root.version, 'v1.0.0');
        assert.strictEqual(root.serializer, 'LCL_OBJECT_INTF');
        assert.strictEqual(root.serializer_version, 'v1.0.0');
        assert.strictEqual(root.abap.version, '1.0');

        // VSEOINTERF content (interface)
        const intf = root.abap.values.VSEOINTERF!;
        assert.strictEqual(intf.CLSNAME, 'ZIF_AGE_TEST');
        assert.strictEqual(intf.LANGU, 'E');
        assert.strictEqual(intf.DESCRIPT, 'Test interface');
        assert.strictEqual(intf.EXPOSURE, '2');
        assert.strictEqual(intf.STATE, '1');
        assert.strictEqual(intf.UNICODE, 'X');
      },
    },
  ],
};

runSchemaTests(scenario);
