import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getHandler } from '../../src/lib/handlers/base.ts';
import '../../src/lib/handlers/objects/index.ts';

for (const type of [
  'DRAS',
  'DRTY',
  'DSFD',
  'DTEB',
  'DTDC',
  'DTIX',
  'DTSC',
] as const) {
  describe(`${type} AFF handler`, () => {
    it('writes exactly the official source and JSON files', async () => {
      const handler = getHandler(type);
      assert.ok(handler);
      const files = await handler.serialize({
        name: `Z_AFF_${type}`,
        description: `${type} fixture`,
        originalLanguage: 'EN',
        getSource: async () => `define ${type.toLowerCase()} Z_AFF_${type}`,
      });
      assert.deepEqual(files.map((file) => file.path).sort(), [
        `z_aff_${type.toLowerCase()}.${type.toLowerCase()}.acds`,
        `z_aff_${type.toLowerCase()}.${type.toLowerCase()}.json`,
      ]);
      assert.deepEqual(
        JSON.parse(files.find((file) => file.path.endsWith('.json'))!.content),
        {
          formatVersion: '1',
          header: { description: `${type} fixture`, originalLanguage: 'en' },
        },
      );
    });
  });
}
