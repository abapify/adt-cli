import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getHandler } from '../../src/lib/handlers/base.ts';
import '../../src/lib/handlers/objects/index.ts';

describe('DCLS AFF handler', () => {
  it('writes the official .dcls.json and .dcls.acds layout', async () => {
    const handler = getHandler('DCLS');
    assert.ok(handler);
    const files = await handler.serialize({
      name: 'Z_AFF_DCL',
      description: 'Access control for tests',
      originalLanguage: 'EN',
      getSource: async () =>
        'define role Z_AFF_DCL { grant select on ZI_AFF; }',
    });
    assert.deepEqual(files.map((file) => file.path).sort(), [
      'z_aff_dcl.dcls.acds',
      'z_aff_dcl.dcls.json',
    ]);
    assert.deepEqual(
      JSON.parse(files.find((file) => file.path.endsWith('.json'))!.content),
      {
        formatVersion: '1',
        header: {
          description: 'Access control for tests',
          originalLanguage: 'en',
        },
      },
    );
  });
});
