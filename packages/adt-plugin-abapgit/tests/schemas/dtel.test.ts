/**
 * Test for DTEL (Data Element) schema
 *
 * Fixture-driven: parses XML, validates content, round-trips
 */

import assert from 'node:assert';
import {
  runSchemaTests,
  createTypedSchema,
  type SchemaScenario,
} from './base/scenario.ts';
import { dtel as dtelSchema } from '../../src/schemas/generated/schemas/index.ts';
import type { DtelSchema } from '../../src/schemas/generated/types/dtel.ts';

const schema = createTypedSchema<DtelSchema>(dtelSchema);

const scenario: SchemaScenario<DtelSchema> = {
  name: 'DTEL',
  xsdName: 'dtel',
  schema,
  fixtures: [
    {
      path: 'dtel/zage_dtel_with_domain.dtel.xml',
      validate: (data) => {
        // Schema is union type - assert to the abapGit variant
        const root = (data as any).abapGit;

        // Envelope
        assert.strictEqual(root.version, 'v1.0.0');
        assert.strictEqual(root.serializer, 'LCL_OBJECT_DTEL');
        assert.strictEqual(root.serializer_version, 'v1.0.0');
        assert.strictEqual(root.abap.version, '1.0');

        // DD04V content (data element)
        const dd04v = root.abap.values.DD04V!;
        assert.strictEqual(dd04v.ROLLNAME, 'ZAGE_DTEL_WITH_DOMAIN');
        assert.strictEqual(dd04v.DDLANGUAGE, 'E');
        assert.strictEqual(dd04v.DOMNAME, 'ZAGE_CHAR_WITH_LENGTH');
        assert.strictEqual(dd04v.DDTEXT, 'Using Domain');
        assert.strictEqual(dd04v.REPTEXT, 'heading text');
        assert.strictEqual(dd04v.SCRTEXT_S, 'short text');
        assert.strictEqual(dd04v.SCRTEXT_M, 'medium text');
        assert.strictEqual(dd04v.SCRTEXT_L, 'very long text');
        assert.strictEqual(dd04v.HEADLEN, '55');
        assert.strictEqual(dd04v.SCRLEN1, '10');
        assert.strictEqual(dd04v.SCRLEN2, '20');
        assert.strictEqual(dd04v.SCRLEN3, '40');
        assert.strictEqual(dd04v.DTELMASTER, 'E');
        assert.strictEqual(dd04v.REFKIND, 'D');
      },
    },
    {
      path: 'dtel/zage_dtel_predefined_type.dtel.xml',
      validate: (data) => {
        const root = (data as any).abapGit;
        const dd04v = root.abap.values.DD04V!;
        assert.strictEqual(dd04v.ROLLNAME, 'ZAGE_DTEL_PREDEFINED_TYPE');
        assert.strictEqual(dd04v.DATATYPE, 'CHAR');
        assert.strictEqual(dd04v.LENG, '000001');
        assert.strictEqual(dd04v.OUTPUTLEN, '000001');
        assert.strictEqual(dd04v.DDTEXT, 'Predefined type');
        // No DOMNAME for predefined type
        assert.strictEqual(dd04v.DOMNAME, undefined);
      },
    },
    {
      path: 'dtel/zage_dtel_with_decimals.dtel.xml',
      validate: (data) => {
        const root = (data as any).abapGit;
        const dd04v = root.abap.values.DD04V!;
        assert.strictEqual(dd04v.ROLLNAME, 'ZAGE_DTEL_WITH_DECIMALS');
        assert.strictEqual(dd04v.DATATYPE, 'CURR');
        assert.strictEqual(dd04v.LENG, '000013');
        assert.strictEqual(dd04v.DECIMALS, '000002');
        assert.strictEqual(dd04v.OUTPUTLEN, '000017');
        assert.strictEqual(dd04v.DDTEXT, 'Data element with decimals');
      },
    },
    {
      path: 'dtel/zage_dtel_ref_to_clas.dtel.xml',
      validate: (data) => {
        const root = (data as any).abapGit;
        const dd04v = root.abap.values.DD04V!;
        assert.strictEqual(dd04v.ROLLNAME, 'ZAGE_DTEL_REF_TO_CLAS');
        assert.strictEqual(dd04v.DOMNAME, 'CL_ABAP_MATH');
        assert.strictEqual(dd04v.DATATYPE, 'REF');
        assert.strictEqual(dd04v.REFKIND, 'R');
        assert.strictEqual(dd04v.REFTYPE, 'C');
        assert.strictEqual(dd04v.DDTEXT, 'Ref to class');
      },
    },
    {
      path: 'dtel/zage_dtel_ref_to_ddic.dtel.xml',
      validate: (data) => {
        const root = (data as any).abapGit;
        const dd04v = root.abap.values.DD04V!;
        assert.strictEqual(dd04v.ROLLNAME, 'ZAGE_DTEL_REF_TO_DDIC');
        assert.strictEqual(dd04v.DOMNAME, 'ZAGE_DTEL_WITH_DOMAIN');
        assert.strictEqual(dd04v.DATATYPE, 'REF');
        assert.strictEqual(dd04v.REFKIND, 'R');
        assert.strictEqual(dd04v.REFTYPE, 'E');
        assert.strictEqual(dd04v.DDTEXT, 'Ref to dictionary type');
      },
    },
    {
      path: 'dtel/zage_dtel_ref_to_predefined.dtel.xml',
      validate: (data) => {
        const root = (data as any).abapGit;
        const dd04v = root.abap.values.DD04V!;
        assert.strictEqual(dd04v.ROLLNAME, 'ZAGE_DTEL_REF_TO_PREDEFINED');
        assert.strictEqual(dd04v.DOMNAME, 'ABAP_BOOLEAN');
        assert.strictEqual(dd04v.DATATYPE, 'REF');
        assert.strictEqual(dd04v.REFKIND, 'R');
        assert.strictEqual(dd04v.REFTYPE, 'E');
        assert.strictEqual(dd04v.ABAP_LANGUAGE_VERSION, '5');
        assert.strictEqual(dd04v.DDTEXT, 'Ref to predefined type');
      },
    },
    {
      path: 'dtel/zage_dtel_value_table_key.dtel.xml',
      validate: (data) => {
        const root = (data as any).abapGit;
        const dd04v = root.abap.values.DD04V!;
        assert.strictEqual(dd04v.ROLLNAME, 'ZAGE_DTEL_VALUE_TABLE_KEY');
        assert.strictEqual(dd04v.DOMNAME, 'ZAGE_DOMA_VALUE_TABLE');
        assert.strictEqual(dd04v.REFKIND, 'D');
        assert.strictEqual(dd04v.ABAP_LANGUAGE_VERSION, '5');
        assert.strictEqual(dd04v.DDTEXT, 'Value table _key');
        // No DATATYPE — domain-based
        assert.strictEqual(dd04v.DATATYPE, undefined);
      },
    },
  ],
};

runSchemaTests(scenario);
