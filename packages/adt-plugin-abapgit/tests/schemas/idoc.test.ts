/**
 * Test for IDOC (IDoc Type) schema
 *
 * Fixture-driven: parses XML, validates content, round-trips
 */

import assert from 'node:assert';
import {
  runSchemaTests,
  createTypedSchema,
  extractAbapGitRoot,
  type SchemaScenario,
} from './base/scenario.ts';
import { idoc as idocSchema } from '../../src/schemas/generated/schemas/index.ts';
import type { IdocSchema } from '../../src/schemas/generated/types/idoc.ts';

const schema = createTypedSchema<IdocSchema>(idocSchema);

const scenario: SchemaScenario<IdocSchema> = {
  name: 'IDOC',
  xsdName: 'idoc',
  schema,
  fixtures: [
    {
      path: 'idoc/ztest_idoc.idoc.xml',
      validate: (data) => {
        const root = extractAbapGitRoot(data);

        assert.strictEqual(root.version, 'v1.0.0');
        assert.strictEqual(root.serializer, 'LCL_OBJECT_IDOC');
        assert.strictEqual(root.serializer_version, 'v1.0.0');

        const idoc = root.abap.values.IDOC!;
        assert.strictEqual(idoc.ATTRIBUTES.IDOCTYP, 'ZTEST_IDOC');
        assert.strictEqual(idoc.ATTRIBUTES.DESCRP, 'Test IDoc type');
        assert.strictEqual(idoc.ATTRIBUTES.RELEASED, 'X');
        assert.strictEqual(idoc.ATTRIBUTES.APPLREL, '46C');

        const syntax = idoc.T_SYNTAX;
        assert.ok(syntax, 'T_SYNTAX should exist');
        assert.strictEqual(syntax!.EDI_IAPI02?.length, 2);
        assert.strictEqual(syntax!.EDI_IAPI02![0].SEGTYP, 'ZTEST_SEG1');
        assert.strictEqual(syntax!.EDI_IAPI02![0].MUSTFL, 'X');
        assert.strictEqual(syntax!.EDI_IAPI02![1].SEGTYP, 'ZTEST_SEG2');
        assert.strictEqual(syntax!.EDI_IAPI02![1].PARFLG, 'X');
      },
    },
  ],
};

runSchemaTests(scenario);
