/**
 * Test for DOMA (Domain) schema
 *
 * Fixture-driven: parses XML, validates content, round-trips
 */

import assert from 'node:assert';
import {
  runSchemaTests,
  createTypedSchema,
  type SchemaScenario,
} from './base/scenario.ts';
import { doma as domaSchema } from '../../src/schemas/generated/schemas/index.ts';
import type { DomaSchema } from '../../src/schemas/generated/types/doma.ts';

const schema = createTypedSchema<DomaSchema>(domaSchema);

const scenario: SchemaScenario<DomaSchema> = {
  name: 'DOMA',
  xsdName: 'doma',
  schema,
  fixtures: [
    {
      path: 'doma/zage_fixed_values.doma.xml',
      validate: (data) => {
        // Schema is union type - assert to the abapGit variant
        const root = (data as any).abapGit;

        // Envelope
        assert.strictEqual(root.version, 'v1.0.0');
        assert.strictEqual(root.serializer, 'LCL_OBJECT_DOMA');
        assert.strictEqual(root.serializer_version, 'v1.0.0');
        assert.strictEqual(root.abap.version, '1.0');

        // DD01V content (domain header)
        const dd01v = root.abap.values.DD01V!;
        assert.strictEqual(dd01v.DOMNAME, 'ZAGE_FIXED_VALUES');
        assert.strictEqual(dd01v.DDLANGUAGE, 'E');
        assert.strictEqual(dd01v.DATATYPE, 'CHAR');
        assert.strictEqual(dd01v.LENG, '000001');
        assert.strictEqual(dd01v.OUTPUTLEN, '000001');
        assert.strictEqual(dd01v.VALEXI, 'X');
        assert.strictEqual(dd01v.DDTEXT, 'Fixed values');

        // DD07V_TAB content (fixed values)
        const dd07vTab = root.abap.values.DD07V_TAB;
        assert.ok(dd07vTab, 'DD07V_TAB should exist');
        assert.strictEqual(dd07vTab!.DD07V?.length, 2);

        // First fixed value
        const val1 = dd07vTab!.DD07V![0];
        assert.strictEqual(val1.VALPOS, '0001');
        assert.strictEqual(val1.DOMVALUE_L, 'A');
        assert.strictEqual(val1.DDTEXT, 'This is A');

        // Second fixed value
        const val2 = dd07vTab!.DD07V![1];
        assert.strictEqual(val2.VALPOS, '0002');
        assert.strictEqual(val2.DOMVALUE_L, 'B');
        assert.strictEqual(val2.DDTEXT, 'This is B');
      },
    },
  ],
};

runSchemaTests(scenario);
