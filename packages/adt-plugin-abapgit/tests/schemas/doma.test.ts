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
    {
      path: 'doma/zage_doma_case_sensitive.doma.xml',
      validate: (data) => {
        const root = (data as any).abapGit;
        const dd01v = root.abap.values.DD01V!;
        assert.strictEqual(dd01v.DOMNAME, 'ZAGE_DOMA_CASE_SENSITIVE');
        assert.strictEqual(dd01v.DATATYPE, 'CHAR');
        assert.strictEqual(dd01v.LENG, '000001');
        assert.strictEqual(dd01v.LOWERCASE, 'X');
        assert.strictEqual(dd01v.DDTEXT, 'Case sensitive domain');
        // No DD07V_TAB (no fixed values)
        assert.strictEqual(root.abap.values.DD07V_TAB, undefined);
      },
    },
    {
      path: 'doma/zage_doma_char_with_length.doma.xml',
      validate: (data) => {
        const root = (data as any).abapGit;
        const dd01v = root.abap.values.DD01V!;
        assert.strictEqual(dd01v.DOMNAME, 'ZAGE_DOMA_CHAR_WITH_LENGTH');
        assert.strictEqual(dd01v.DATATYPE, 'CHAR');
        assert.strictEqual(dd01v.LENG, '000010');
        assert.strictEqual(dd01v.OUTPUTLEN, '000010');
        assert.strictEqual(dd01v.LOWERCASE, 'X');
        assert.strictEqual(dd01v.DDTEXT, 'Char with length');
      },
    },
    {
      path: 'doma/zage_doma_conversion.doma.xml',
      validate: (data) => {
        const root = (data as any).abapGit;
        const dd01v = root.abap.values.DD01V!;
        assert.strictEqual(dd01v.DOMNAME, 'ZAGE_DOMA_CONVERSION');
        assert.strictEqual(dd01v.DATATYPE, 'CHAR');
        assert.strictEqual(dd01v.LENG, '000010');
        assert.strictEqual(dd01v.CONVEXIT, 'ALPHA');
        assert.strictEqual(dd01v.DDTEXT, 'Domain with alpha conversion');
      },
    },
    {
      path: 'doma/zage_doma_intervals.doma.xml',
      validate: (data) => {
        const root = (data as any).abapGit;
        const dd01v = root.abap.values.DD01V!;
        assert.strictEqual(dd01v.DOMNAME, 'ZAGE_DOMA_INTERVALS');
        assert.strictEqual(dd01v.DATATYPE, 'NUMC');
        assert.strictEqual(dd01v.LENG, '000004');
        assert.strictEqual(dd01v.VALEXI, 'X');

        // DD07V_TAB with interval values (DOMVALUE_H populated)
        const dd07vTab = root.abap.values.DD07V_TAB;
        assert.ok(dd07vTab, 'DD07V_TAB should exist');
        assert.strictEqual(dd07vTab!.DD07V?.length, 2);

        const val1 = dd07vTab!.DD07V![0];
        assert.strictEqual(val1.DOMVALUE_L, '1000');
        assert.strictEqual(val1.DOMVALUE_H, '2000');
        assert.strictEqual(val1.DDTEXT, '>1K');

        const val2 = dd07vTab!.DD07V![1];
        assert.strictEqual(val2.DOMVALUE_L, '2001');
        assert.strictEqual(val2.DOMVALUE_H, '9999');
        assert.strictEqual(val2.DDTEXT, '>2K');
      },
    },
    {
      path: 'doma/zage_doma_value_table.doma.xml',
      validate: (data) => {
        const root = (data as any).abapGit;
        const dd01v = root.abap.values.DD01V!;
        assert.strictEqual(dd01v.DOMNAME, 'ZAGE_DOMA_VALUE_TABLE');
        assert.strictEqual(dd01v.DATATYPE, 'NUMC');
        assert.strictEqual(dd01v.LENG, '000003');
        assert.strictEqual(dd01v.ENTITYTAB, 'ZAGE_VALUE_TABLE');
        assert.strictEqual(dd01v.DDTEXT, 'Domain with value table');
      },
    },
  ],
};

runSchemaTests(scenario);
