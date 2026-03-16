/**
 * Test for TABL (Table/Structure) schema
 *
 * Fixture-driven: parses XML, validates content, round-trips
 */

import assert from 'node:assert';
import {
  runSchemaTests,
  createTypedSchema,
  type SchemaScenario,
} from './base/scenario.ts';
import { tabl as tablSchema } from '../../src/schemas/generated/schemas/index.ts';
import type { TablSchema } from '../../src/schemas/generated/types/tabl.ts';

const schema = createTypedSchema<TablSchema>(tablSchema);

const scenario: SchemaScenario<TablSchema> = {
  name: 'TABL',
  xsdName: 'tabl',
  schema,
  fixtures: [
    {
      path: 'tabl/zage_structure.tabl.xml',
      validate: (data) => {
        const root = (data as any).abapGit;

        // Envelope
        assert.strictEqual(root.version, 'v1.0.0');
        assert.strictEqual(root.serializer, 'LCL_OBJECT_TABL');
        assert.strictEqual(root.serializer_version, 'v1.0.0');

        // DD02V content (table header)
        const dd02v = root.abap.values.DD02V!;
        assert.strictEqual(dd02v.TABNAME, 'ZAGE_STRUCTURE');
        assert.strictEqual(dd02v.DDLANGUAGE, 'E');
        assert.strictEqual(dd02v.TABCLASS, 'INTTAB');
        assert.strictEqual(dd02v.DDTEXT, 'AGE Test Structure');

        // DD03P_TABLE content (fields)
        const dd03pTable = root.abap.values.DD03P_TABLE;
        assert.ok(dd03pTable, 'DD03P_TABLE should exist');
        assert.strictEqual(dd03pTable!.DD03P?.length, 3);

        // First field
        const field1 = dd03pTable!.DD03P![0];
        assert.strictEqual(field1.FIELDNAME, 'PARTNER_ID');
        assert.strictEqual(field1.POSITION, '0001');
        assert.strictEqual(field1.DATATYPE, 'CHAR');
        assert.strictEqual(field1.LENG, '000010');

        // Third field (CURR type)
        const field3 = dd03pTable!.DD03P![2];
        assert.strictEqual(field3.FIELDNAME, 'AMOUNT');
        assert.strictEqual(field3.DATATYPE, 'CURR');
        assert.strictEqual(field3.DECIMALS, '000002');
      },
    },
    {
      path: 'tabl/zage_transparent_table.tabl.xml',
      validate: (data) => {
        const root = (data as any).abapGit;

        // DD02V
        const dd02v = root.abap.values.DD02V!;
        assert.strictEqual(dd02v.TABNAME, 'ZAGE_TRANSPARENT_TABLE');
        assert.strictEqual(dd02v.TABCLASS, 'TRANSP');
        assert.strictEqual(dd02v.CONTFLAG, 'A');

        // Fields
        const dd03pTable = root.abap.values.DD03P_TABLE;
        assert.ok(dd03pTable);
        assert.strictEqual(dd03pTable!.DD03P?.length, 3);

        // Key field
        const mandt = dd03pTable!.DD03P![0];
        assert.strictEqual(mandt.FIELDNAME, 'MANDT');
        assert.strictEqual(mandt.KEYFLAG, 'X');
        assert.strictEqual(mandt.NOTNULL, 'X');
      },
    },
  ],
};

runSchemaTests(scenario);
