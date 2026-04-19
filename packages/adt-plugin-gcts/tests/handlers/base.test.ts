/**
 * Handler factory tests for the gCTS plugin.
 *
 * Mirrors the abapGit `base.test.ts` but asserts JSON output and AFF
 * filename conventions.
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import {
  createHandler,
  getHandler,
  getSupportedTypes,
  __resetRegistry,
} from '../../src/lib/handlers/base.ts';

describe('gcts createHandler factory', () => {
  before(() => __resetRegistry());

  it('creates and auto-registers a handler with string type', () => {
    const h = createHandler('TEST_BASE', {
      toMetadata: (obj: any) => ({
        header: { formatVersion: '1.0', description: obj.description ?? '' },
        test: { name: obj.name },
      }),
    });
    assert.strictEqual(h.type, 'TEST_BASE');
    assert.strictEqual(h.fileExtension, 'test_base');
    assert.ok(getSupportedTypes().includes('TEST_BASE'));
    assert.strictEqual(getHandler('TEST_BASE')?.type, 'TEST_BASE');
  });

  it('returns undefined for unknown types', () => {
    assert.strictEqual(getHandler('__UNKNOWN__'), undefined);
  });
});

describe('default serialize behaviour', () => {
  it('emits JSON metadata only when no source is provided', async () => {
    const h = createHandler('TEST_META_ONLY', {
      toMetadata: (obj: any) => ({
        header: { formatVersion: '1.0', description: obj.description },
        item: { name: obj.name },
      }),
    });

    const files = await h.serialize({
      name: 'FOO',
      description: 'Hi',
      dataSync: {},
    } as any);
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].path, 'foo.test_meta_only.json');
    const parsed = JSON.parse(files[0].content);
    assert.strictEqual(parsed.header.formatVersion, '1.0');
    assert.strictEqual(parsed.item.name, 'FOO');
  });

  it('emits source + metadata when getSource is provided', async () => {
    const h = createHandler('TEST_WITH_SRC', {
      toMetadata: (obj: any) => ({
        header: { formatVersion: '1.0' },
        item: { name: obj.name },
      }),
      getSource: async () => 'REPORT zdemo.',
    });

    const files = await h.serialize({ name: 'ZDEMO', dataSync: {} } as any);
    assert.strictEqual(files.length, 2);
    assert.ok(
      files.find((f) => f.path === 'zdemo.test_with_src.abap'),
      'has source',
    );
    assert.ok(
      files.find((f) => f.path === 'zdemo.test_with_src.json'),
      'has metadata',
    );
  });

  it('emits multiple sources with suffixes (CLAS-style)', async () => {
    const h = createHandler('TEST_MULTI_SRC', {
      toMetadata: (obj: any) => ({
        header: { formatVersion: '1.0' },
        item: { name: obj.name },
      }),
      getSources: () => [
        { content: '* main' },
        { suffix: 'locals_def', content: '* defs' },
        { suffix: 'testclasses', content: '' }, // empty → filtered
      ],
    });

    const files = await h.serialize({ name: 'ZCL_X', dataSync: {} } as any);
    const abap = files.filter((f) => f.path.endsWith('.abap'));
    const json = files.filter((f) => f.path.endsWith('.json'));
    assert.strictEqual(abap.length, 2);
    assert.strictEqual(json.length, 1);
    assert.ok(abap.some((f) => f.path === 'zcl_x.test_multi_src.abap'));
    assert.ok(
      abap.some((f) => f.path === 'zcl_x.test_multi_src.locals_def.abap'),
    );
  });

  it('honours custom metadataFileName (DEVC-style)', async () => {
    const h = createHandler('TEST_CUSTOM_NAME', {
      metadataFileName: 'package.devc.json',
      toMetadata: (obj: any) => ({
        header: { formatVersion: '1.0' },
        package: { name: obj.name },
      }),
    });

    const files = await h.serialize({ name: 'ZPKG', dataSync: {} } as any);
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].path, 'package.devc.json');
  });

  it('schema.parse / schema.build round-trip JSON', () => {
    const h = createHandler('TEST_SCHEMA_RT', {
      toMetadata: () => ({ header: { formatVersion: '1.0' } }),
    });
    const payload = { header: { formatVersion: '1.0' }, extra: { a: 1 } };
    const built = h.schema.build(payload);
    const parsed = h.schema.parse(built);
    assert.deepStrictEqual(parsed, payload);
  });
});
