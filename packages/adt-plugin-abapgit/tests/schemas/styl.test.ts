/**
 * Test for STYL (SAPscript Style) schema
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
import { styl as stylSchema } from '../../src/schemas/generated/schemas/index.ts';
import type { StylSchema } from '../../src/schemas/generated/types/styl.ts';

const schema = createTypedSchema<StylSchema>(stylSchema);

const scenario: SchemaScenario<StylSchema> = {
  name: 'STYL',
  xsdName: 'styl',
  schema,
  fixtures: [
    {
      path: 'styl/ztest_style.styl.xml',
      validate: (data) => {
        const root = extractAbapGitRoot(data);

        assert.strictEqual(root.version, 'v1.0.0');
        assert.strictEqual(root.serializer, 'LCL_OBJECT_STYL');
        assert.strictEqual(root.serializer_version, 'v1.0.0');

        const style = root.abap.values.STYLE!;
        assert.strictEqual(style.HEADER?.TDSTYLE, 'ZTEST_STYLE');
        assert.strictEqual(style.HEADER?.TDSPRAS, 'E');
        assert.strictEqual(style.HEADER?.TDPRINTER, 'LP01');
        assert.strictEqual(style.HEADER?.TDTEXT, 'Test style');
        assert.strictEqual(style.HEADER?.TDFIRSTPAR, 'PA');

        assert.strictEqual(style.PARAGRAPHS?.item?.length, 1);
        assert.strictEqual(style.PARAGRAPHS?.item?.[0].TDPARGRAPH, 'PA');
        assert.strictEqual(
          style.PARAGRAPHS?.item?.[0].TDTEXT,
          'Standard paragraph',
        );

        assert.strictEqual(style.STRINGS?.item?.length, 1);
        assert.strictEqual(style.STRINGS?.item?.[0].TDSTRING, 'S1');
        assert.strictEqual(style.STRINGS?.item?.[0].TDTEXT, 'Character string');

        assert.strictEqual(style.TABS?.item?.length, 1);
        assert.strictEqual(style.TABS?.item?.[0].TDPOSITION, '10.00');
      },
    },
  ],
};

runSchemaTests(scenario);
