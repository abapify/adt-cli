/**
 * SRVB abapGit handler tests
 *
 * SRVB is metadata-only — unlike BDEF/SRVD there is no source text.
 * Validates that:
 *  - handler is registered for 'SRVB'
 *  - serialize produces a single `<name>.srvb.xml` file (no source)
 *  - fromAbapGit round-trips SKEY/NAME → ADK data
 *  - the XML contains SKEY + BINDING blocks
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getHandler } from '../../src/lib/handlers/base.ts';
// Importing the object index triggers auto-registration of all handlers.
import '../../src/lib/handlers/objects/index.ts';

describe('SRVB abapGit handler', () => {
  it('is registered for type "SRVB"', () => {
    const handler = getHandler('SRVB');
    assert.ok(handler, 'Expected SRVB handler to be registered');
    assert.strictEqual(handler!.type, 'SRVB');
    assert.strictEqual(handler!.fileExtension, 'srvb');
  });

  it('serialize produces a single .srvb.xml file (metadata-only)', async () => {
    const handler = getHandler('SRVB');
    assert.ok(handler);

    const mockSrvb = { name: 'ZUI_MOCK_SRVB' };

    const files = await handler!.serialize(mockSrvb as any);
    const paths = files.map((f) => f.path);

    assert.deepStrictEqual(paths, ['zui_mock_srvb.srvb.xml']);

    const xml = files[0]?.content;
    assert.ok(xml?.includes('<abapGit'));
    assert.ok(xml?.includes('SKEY'));
    assert.ok(xml?.includes('BINDING'));
    assert.ok(xml?.includes('ZUI_MOCK_SRVB'));
  });

  it('fromAbapGit maps SKEY.NAME to ADK data', () => {
    const handler = getHandler('SRVB');
    assert.ok(handler?.fromAbapGit, 'Expected fromAbapGit to be defined');

    const data = handler!.fromAbapGit!({
      SKEY: { TYPE: 'SRVB', NAME: 'zui_round' },
    } as any);

    assert.strictEqual(data.name, 'ZUI_ROUND');
  });
});
