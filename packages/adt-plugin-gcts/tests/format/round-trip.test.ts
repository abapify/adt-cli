/**
 * End-to-end tests that exercise the full module graph:
 *
 *  1. `import '../../src/index'` — triggers FormatPlugin self-registration
 *     *and* loads every object handler.
 *  2. `getFormatPlugin('gcts')` returns the registered plugin and its
 *     `supportedTypes` covers the 9 AFF types we ship handlers for.
 *  3. The concrete `gctsPlugin.format.import(...)` path writes the expected
 *     files to disk for a minimal fake ADK package object. This is the
 *     closest we can get to `adt import package --format gcts <pkg>` in a
 *     pure unit test (no network, no real ADT client).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Trigger plugin self-registration.
import '../../src/index.ts';
import { getFormatPlugin } from '@abapify/adt-plugin';
import { gctsPlugin } from '../../src/lib/gcts-plugin.ts';

describe('FormatPlugin registration', () => {
  it('self-registers under id "gcts"', () => {
    const p = getFormatPlugin('gcts');
    assert.ok(p, 'gcts FormatPlugin must be registered after module import');
    assert.strictEqual(p?.id, 'gcts');
    assert.ok(p?.description.length > 0);
  });

  it('exposes the nine handler types shipped in v0.1', () => {
    const p = getFormatPlugin('gcts')!;
    const types = p.supportedTypes;
    const expected = [
      'CLAS',
      'INTF',
      'PROG',
      'DEVC',
      'DOMA',
      'DTEL',
      'TABL',
      'TTYP',
      'FUGR',
    ];
    for (const t of expected) {
      assert.ok(types.includes(t), `missing handler for ${t}`);
    }
  });

  it('parseFilename delegates to the AFF parser', () => {
    const p = getFormatPlugin('gcts')!;
    const parsed = p.parseFilename?.('zcl_foo.clas.json');
    assert.strictEqual(parsed?.type, 'CLAS');
    assert.strictEqual(parsed?.name, 'zcl_foo');
  });
});

describe('gctsPlugin.format.import — package round-trip', () => {
  it('writes a gCTS-shaped tree for a package-like object', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gcts-e2e-'));
    try {
      // Minimal fake package object — only the shape the serializer needs.
      const fake = {
        type: 'DEVC/K',
        name: 'ZMYPKG',
        description: 'My Package',
        dataSync: { language: 'en' },
      };

      const ctx = {
        async resolvePackagePath(name: string) {
          return [name];
        },
      };

      const result = await gctsPlugin.format.import!(
        fake as any,
        dir,
        ctx as any,
      );
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.filesCreated.length, 1);

      const packageDir = join(dir, 'src', 'zmypkg');
      const entries = readdirSync(packageDir);
      assert.deepStrictEqual(entries, ['package.devc.json']);

      const raw = readFileSync(join(packageDir, 'package.devc.json'), 'utf8');
      const parsed = JSON.parse(raw);
      assert.strictEqual(parsed.header.formatVersion, '1.0');
      assert.strictEqual(parsed.header.description, 'My Package');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
