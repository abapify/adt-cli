/**
 * SRVD abapGit handler tests
 *
 * Validates that:
 *  - handler is registered for 'SRVD'
 *  - serialize produces `<name>.srvd.asrvd` + `<name>.srvd.xml`
 *  - fromAbapGit round-trips SKEY/NAME → ADK data
 *  - schema is valid and builds the expected XML shape
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getHandler } from '../../src/lib/handlers/base.ts';
// Importing the object index triggers auto-registration of all handlers.
import '../../src/lib/handlers/objects/index.ts';

describe('SRVD abapGit handler', () => {
  it('is registered for type "SRVD"', () => {
    const handler = getHandler('SRVD');
    assert.ok(handler, 'Expected SRVD handler to be registered');
    assert.strictEqual(handler!.type, 'SRVD');
    assert.strictEqual(handler!.fileExtension, 'srvd');
  });

  it('serialize produces .srvd.asrvd and .srvd.xml files', async () => {
    const handler = getHandler('SRVD');
    assert.ok(handler);

    const mockSrvd = {
      name: 'ZUI_MOCK_SRVD',
      getSource: async () =>
        'define service ZUI_MOCK_SRVD { expose ZI_MOCK_ROOT; }\n',
    };

    const files = await handler!.serialize(mockSrvd as any);
    const paths = files.map((f) => f.path);

    assert.deepStrictEqual(
      [...paths].sort((a: string, b: string) => a.localeCompare(b)),
      ['zui_mock_srvd.srvd.asrvd', 'zui_mock_srvd.srvd.xml'],
    );

    const source = files.find((f) => f.path.endsWith('.asrvd'));
    assert.ok(source?.content.includes('define service'));

    const xml = files.find((f) => f.path.endsWith('.xml'));
    assert.ok(xml?.content.includes('<abapGit'));
    assert.ok(xml?.content.includes('SKEY'));
    assert.ok(xml?.content.includes('ZUI_MOCK_SRVD'));
  });

  it('serialize skips .asrvd file when source is empty', async () => {
    const handler = getHandler('SRVD');
    assert.ok(handler);

    const mockSrvd = {
      name: 'ZUI_EMPTY',
      getSource: async () => '',
    };

    const files = await handler!.serialize(mockSrvd as any);
    const paths = files.map((f) => f.path);

    assert.deepStrictEqual(paths, ['zui_empty.srvd.xml']);
  });

  it('fromAbapGit maps SKEY.NAME to ADK data', () => {
    const handler = getHandler('SRVD');
    assert.ok(handler?.fromAbapGit, 'Expected fromAbapGit to be defined');

    const data = handler!.fromAbapGit!({
      SKEY: { TYPE: 'SRVD', NAME: 'zui_round' },
    } as any);

    assert.strictEqual(data.name, 'ZUI_ROUND');
  });
});
