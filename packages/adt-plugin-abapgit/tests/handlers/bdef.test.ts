/**
 * BDEF abapGit handler tests
 *
 * Validates that:
 *  - handler is registered for 'BDEF'
 *  - serialize produces `<name>.bdef.abdl` + `<name>.bdef.json`
 *  - fromAbapGit round-trips SKEY/NAME → ADK data
 *  - schema is valid and builds the expected XML shape
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getHandler } from '../../src/lib/handlers/base';
// Importing the object index triggers auto-registration of all handlers.
import '../../src/lib/handlers/objects/index';

describe('BDEF abapGit handler', () => {
  it('is registered for type "BDEF"', () => {
    const handler = getHandler('BDEF');
    assert.ok(handler, 'Expected BDEF handler to be registered');
    assert.strictEqual(handler!.type, 'BDEF');
    assert.strictEqual(handler!.fileExtension, 'bdef');
  });

  it('serializes the official AFF .bdef.abdl and .bdef.json layout', async () => {
    const handler = getHandler('BDEF');
    assert.ok(handler);

    const mockBdef = {
      name: 'ZBP_MOCK_BDEF',
      getSource: async () =>
        'managed implementation in class zbp_mock_bdef unique;\n',
    };

    const files = await handler!.serialize(mockBdef as any);
    const paths = files.map((f) => f.path);

    assert.deepStrictEqual(
      [...paths].sort((a: string, b: string) => a.localeCompare(b)),
      ['zbp_mock_bdef.bdef.abdl', 'zbp_mock_bdef.bdef.json'],
    );

    const source = files.find((f) => f.path.endsWith('.abdl'));
    assert.ok(source?.content.includes('managed implementation'));

    const metadata = files.find((f) => f.path.endsWith('.json'));
    assert.deepStrictEqual(JSON.parse(metadata!.content), {
      formatVersion: '1',
      header: {
        description: 'ZBP_MOCK_BDEF',
        originalLanguage: 'en',
      },
    });
  });

  it('serializes JSON when the .abdl source is empty', async () => {
    const handler = getHandler('BDEF');
    assert.ok(handler);

    const mockBdef = {
      name: 'ZBP_EMPTY',
      getSource: async () => '',
    };

    const files = await handler!.serialize(mockBdef as any);
    const paths = files.map((f) => f.path);

    assert.deepStrictEqual(paths, ['zbp_empty.bdef.json']);
  });

  it('fromAbapGit maps SKEY.NAME to ADK data', () => {
    const handler = getHandler('BDEF');
    assert.ok(handler?.fromAbapGit, 'Expected fromAbapGit to be defined');

    const data = handler!.fromAbapGit!({
      SKEY: { TYPE: 'BDEF', NAME: 'zbp_round' },
    } as any);

    assert.strictEqual(data.name, 'ZBP_ROUND');
  });
});
