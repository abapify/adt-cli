import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getHandler } from '../../src/lib/handlers/base.ts';
import '../../src/lib/handlers/objects/index.ts';

describe('DESD AFF handler', () => {
  it('writes the official JSON-only external schema layout', async () => {
    const handler = getHandler('DESD');
    assert.ok(handler);
    const files = await handler.serialize({
      name: 'Z_AFF_DESD',
      description: 'External schema',
      originalLanguage: 'EN',
    });
    assert.deepEqual(
      files.map((file) => file.path),
      ['z_aff_desd.desd.json'],
    );
    assert.deepEqual(JSON.parse(files[0]!.content), {
      formatVersion: '1',
      header: { description: 'External schema', originalLanguage: 'en' },
    });
  });
});
