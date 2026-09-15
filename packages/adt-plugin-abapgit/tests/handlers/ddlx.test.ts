import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getHandler } from '../../src/lib/handlers/base.ts';
import '../../src/lib/handlers/objects/index.ts';

describe('DDLX AFF handler', () => {
  it('writes the official .ddlx.json and .ddlx.acds layout', async () => {
    const handler = getHandler('DDLX');
    assert.ok(handler);
    const files = await handler.serialize({
      name: 'Z_AFF_DDLX',
      description: 'Metadata extension for tests',
      originalLanguage: 'EN',
      getSource: async () =>
        '@Metadata.layer: #CORE\nannotate view ZI_ACR with { }',
    });

    assert.deepEqual(files.map((file) => file.path).sort(), [
      'z_aff_ddlx.ddlx.acds',
      'z_aff_ddlx.ddlx.json',
    ]);
    assert.deepEqual(
      JSON.parse(files.find((file) => file.path.endsWith('.json'))!.content),
      {
        formatVersion: '1',
        header: {
          description: 'Metadata extension for tests',
          originalLanguage: 'en',
        },
      },
    );
  });
});
