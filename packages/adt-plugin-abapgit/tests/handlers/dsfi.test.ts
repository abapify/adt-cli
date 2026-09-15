import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getHandler } from '../../src/lib/handlers/base.ts';
import '../../src/lib/handlers/objects/index.ts';

describe('DSFI AFF handler', () => {
  it('preserves the JSON document returned by source/main', async () => {
    const handler = getHandler('DSFI');
    assert.ok(handler);
    const definition = {
      formatVersion: '1' as const,
      header: {
        description: 'Scalar function implementation',
        originalLanguage: 'en',
      },
      scalarFunctionName: 'Z_AFF_DSFD',
      engine: 'analyticalEngine' as const,
    };
    const files = await handler.serialize({
      name: 'Z_AFF_DSFI',
      getSource: async () => definition,
    });
    assert.deepEqual(
      files.map((file) => file.path),
      ['z_aff_dsfi.dsfi.json'],
    );
    assert.deepEqual(JSON.parse(files[0]!.content), definition);
  });
});
