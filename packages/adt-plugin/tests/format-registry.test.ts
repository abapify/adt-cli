/**
 * Unit tests for the format-plugin registry.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  registerFormatPlugin,
  getFormatPlugin,
  requireFormatPlugin,
  listFormatPlugins,
  unregisterFormatPlugin,
  clearFormatRegistry,
  type FormatPlugin,
} from '../src/index';

function makePlugin(
  overrides: Partial<FormatPlugin> & { id: string },
): FormatPlugin {
  return {
    description: `${overrides.id} plugin`,
    supportedTypes: [],
    getHandler: () => undefined,
    ...overrides,
  };
}

describe('format-registry', () => {
  beforeEach(() => clearFormatRegistry());

  it('registers and retrieves a plugin', () => {
    const plugin = makePlugin({ id: 'test', supportedTypes: ['CLAS'] });
    registerFormatPlugin(plugin);

    assert.strictEqual(getFormatPlugin('test'), plugin);
  });

  it('lists all registered plugins', () => {
    registerFormatPlugin(makePlugin({ id: 'a' }));
    registerFormatPlugin(makePlugin({ id: 'b' }));

    const ids = listFormatPlugins()
      .map((p) => p.id)
      .sort();
    assert.deepStrictEqual(ids, ['a', 'b']);
  });

  it('returns undefined for unknown id', () => {
    assert.strictEqual(getFormatPlugin('nope'), undefined);
  });

  it('requireFormatPlugin throws with a helpful message when unknown', () => {
    registerFormatPlugin(makePlugin({ id: 'abapgit' }));

    assert.throws(
      () => requireFormatPlugin('gcts'),
      /Format plugin "gcts" is not registered.*Available formats: abapgit/,
    );
  });

  it('requireFormatPlugin mentions the empty-registry case', () => {
    assert.throws(
      () => requireFormatPlugin('abapgit'),
      /No format plugins are currently registered/,
    );
  });

  it('registering the same instance twice is a no-op', () => {
    const plugin = makePlugin({ id: 'same' });
    registerFormatPlugin(plugin);
    registerFormatPlugin(plugin);

    assert.strictEqual(listFormatPlugins().length, 1);
  });

  it('registering a different plugin under the same id throws', () => {
    registerFormatPlugin(makePlugin({ id: 'dup' }));

    assert.throws(
      () => registerFormatPlugin(makePlugin({ id: 'dup' })),
      /already registered/,
    );
  });

  it('getHandler delegates to the plugin', () => {
    const handler = {
      type: 'CLAS',
      fileExtension: 'clas',
      schema: { parse: () => ({}), build: () => '' },
      serialize: async () => [],
    };
    const plugin = makePlugin({
      id: 'h',
      supportedTypes: ['CLAS'],
      getHandler: (t) => (t === 'CLAS' ? handler : undefined),
    });
    registerFormatPlugin(plugin);

    assert.strictEqual(getFormatPlugin('h')?.getHandler('CLAS'), handler);
    assert.strictEqual(getFormatPlugin('h')?.getHandler('INTF'), undefined);
  });

  it('unregisterFormatPlugin removes the entry', () => {
    const plugin = makePlugin({ id: 'rm' });
    registerFormatPlugin(plugin);

    assert.strictEqual(unregisterFormatPlugin('rm'), true);
    assert.strictEqual(getFormatPlugin('rm'), undefined);
    assert.strictEqual(unregisterFormatPlugin('rm'), false);
  });
});
