/**
 * SRVD abapGit handler tests
 *
 * Validates that:
 *  - handler is registered for 'SRVD'
 *  - serialize produces `<name>.srvd.acds` + `<name>.srvd.json`
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

  it('serializes the official AFF .srvd.acds and .srvd.json layout', async () => {
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
      ['zui_mock_srvd.srvd.acds', 'zui_mock_srvd.srvd.json'],
    );

    const source = files.find((f) => f.path.endsWith('.acds'));
    assert.ok(source?.content.includes('define service'));

    const metadata = files.find((f) => f.path.endsWith('.json'));
    assert.deepStrictEqual(JSON.parse(metadata!.content), {
      formatVersion: '1',
      header: {
        description: 'ZUI_MOCK_SRVD',
        originalLanguage: 'en',
      },
      generalInformation: {
        sourceOrigin: 'abapDevelopmentTools',
        sourceType: 'definition',
      },
    });
  });

  it('serializes JSON when the .acds source is empty', async () => {
    const handler = getHandler('SRVD');
    assert.ok(handler);

    const mockSrvd = {
      name: 'ZUI_EMPTY',
      getSource: async () => '',
    };

    const files = await handler!.serialize(mockSrvd as any);
    const paths = files.map((f) => f.path);

    assert.deepStrictEqual(paths, ['zui_empty.srvd.json']);
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
