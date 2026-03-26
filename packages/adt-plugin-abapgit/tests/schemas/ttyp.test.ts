/**
 * Test for TTYP (Table Type) schema
 *
 * Fixture-driven: parses XML, validates content, round-trips
 */

import assert from 'node:assert';
import {
  runSchemaTests,
  createTypedSchema,
  type SchemaScenario,
} from './base/scenario.ts';
import { ttyp as ttypSchema } from '../../src/schemas/generated/schemas/index.ts';
import type { TtypSchema } from '../../src/schemas/generated/types/ttyp.ts';

const schema = createTypedSchema<TtypSchema>(ttypSchema);

const scenario: SchemaScenario<TtypSchema> = {
  name: 'TTYP',
  xsdName: 'ttyp',
  schema,
  fixtures: [
    {
      path: 'ttyp/zage_ttyp_strtab.ttyp.xml',
      validate: (data) => {
        const root = (data as any).abapGit;

        // Envelope
        assert.strictEqual(root.version, 'v1.0.0');
        assert.strictEqual(root.serializer, 'LCL_OBJECT_TTYP');
        assert.strictEqual(root.serializer_version, 'v1.0.0');

        // DD40V content
        const dd40v = root.abap.values.DD40V!;
        assert.strictEqual(dd40v.TYPENAME, 'ZAGE_TTYP_STRTAB');
        assert.strictEqual(dd40v.DDLANGUAGE, 'E');
        assert.strictEqual(dd40v.ROWTYPE, 'STRING');
        assert.strictEqual(dd40v.ROWKIND, 'S');
        assert.strictEqual(dd40v.ACCESSMODE, 'T');
        assert.strictEqual(dd40v.KEYDEF, 'D');
        assert.strictEqual(dd40v.KEYKIND, 'N');
        assert.strictEqual(dd40v.DDTEXT, 'AGE Test String Table');
        assert.strictEqual(dd40v.ABAP_LANGUAGE_VERSION, '5');
      },
    },
    {
      path: 'ttyp/zage_ttyp_struct.ttyp.xml',
      validate: (data) => {
        const root = (data as any).abapGit;

        // DD40V content
        const dd40v = root.abap.values.DD40V!;
        assert.strictEqual(dd40v.TYPENAME, 'ZAGE_TTYP_STRUCT');
        assert.strictEqual(dd40v.ROWTYPE, 'ZAGE_STRUCTURE');
        assert.strictEqual(dd40v.DATATYPE, 'STRU');
        assert.strictEqual(dd40v.DDTEXT, 'AGE Test Structure Table');
        assert.strictEqual(dd40v.ABAP_LANGUAGE_VERSION, '5');
      },
    },
    {
      path: 'ttyp/zage_ttyp_strtab2.ttyp.xml',
      validate: (data) => {
        const root = (data as any).abapGit;
        const dd40v = root.abap.values.DD40V!;
        assert.strictEqual(dd40v.TYPENAME, 'ZAGE_TTYP_STRTAB2');
        assert.strictEqual(dd40v.ROWTYPE, 'STRING');
        assert.strictEqual(dd40v.ROWKIND, 'S');
        assert.strictEqual(dd40v.DATATYPE, 'STRG');
        assert.strictEqual(dd40v.ACCESSMODE, 'T');
        assert.strictEqual(dd40v.KEYDEF, 'D');
        assert.strictEqual(dd40v.KEYKIND, 'N');
        assert.strictEqual(dd40v.DDTEXT, 'AGE Test String Table v2');
        assert.strictEqual(dd40v.ABAP_LANGUAGE_VERSION, '5');
      },
    },
    {
      path: 'ttyp/zage_ttyp_string.ttyp.xml',
      validate: (data) => {
        const root = (data as any).abapGit;
        const dd40v = root.abap.values.DD40V!;
        assert.strictEqual(dd40v.TYPENAME, 'ZAGE_TTYP_STRING');
        assert.strictEqual(dd40v.DATATYPE, 'STRG');
        assert.strictEqual(dd40v.ACCESSMODE, 'T');
        assert.strictEqual(dd40v.TYPELEN, '000008');
        assert.strictEqual(dd40v.ABAP_LANGUAGE_VERSION, '5');
        assert.strictEqual(dd40v.DDTEXT, 'table of string');
        // No ROWTYPE — uses predefined DATATYPE
        assert.strictEqual(dd40v.ROWTYPE, undefined);
      },
    },
  ],
};

runSchemaTests(scenario);
