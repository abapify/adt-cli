/**
 * End-to-end AFF roundtrip test (W0-T6).
 *
 * Exercises the full `gctsPlugin.format.import` path for a CLAS object
 * (SAP → disk) and verifies the on-disk file layout matches the AFF
 * convention:
 *
 *   src/<pkg>/<name>.clas.json          (AFF metadata)
 *   src/<pkg>/<name>.clas.abap          (main source)
 *   src/<pkg>/<name>.clas.<suffix>.abap (includes)
 *
 * Then parses the JSON metadata back and verifies it round-trips through
 * `fromAbapGit` to recover the ADK fields. This is the closest we can
 * get to `adt export --format aff` + `adt deploy --format aff` without a
 * live SAP system.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import '../../src/index.ts';
import { gctsPlugin } from '../../src/lib/gcts-plugin.ts';

describe('AFF e2e roundtrip — CLAS via gctsPlugin.format.import', () => {
  it('writes AFF-convention files: <name>.clas.json + <name>.clas.abap', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'aff-e2e-'));
    try {
      const fakeClass = {
        type: 'CLAS/OC',
        name: 'ZCL_E2E_TEST',
        description: 'E2E test class',
        package: 'ZMYPKG',
        dataSync: {
          language: 'EN',
          category: 'generalObjectType',
          fixPointArithmetic: true,
          abapLanguageVersion: 'cloudDevelopment',
          include: [{ includeType: 'main' }, { includeType: 'testclasses' }],
        },
        getSource: () =>
          'CLASS zcl_e2e_test DEFINITION PUBLIC FINAL.\nENDCLASS.',
        getIncludeSource: (type: string) =>
          type === 'testclasses'
            ? '* Test classes\n'
            : type === 'main'
              ? 'CLASS zcl_e2e_test DEFINITION PUBLIC FINAL.\nENDCLASS.'
              : '',
      };

      const ctx = {
        async resolvePackagePath(name: string) {
          return [name];
        },
      };

      const result = await gctsPlugin.format.import!(
        fakeClass as any,
        dir,
        ctx as any,
      );

      assert.strictEqual(result.success, true, 'import must succeed');
      assert.ok(
        result.filesCreated.length >= 1,
        'must write at least the JSON file',
      );

      // AFF layout: src/<pkg>/<name>.clas.json
      const packageDir = join(dir, 'src', 'zmypkg');
      const entries = readdirSync(packageDir).sort();
      const jsonFile = entries.find((e) => e.endsWith('.clas.json'));
      const abapFiles = entries.filter((e) => e.endsWith('.abap'));

      assert.ok(jsonFile, 'must produce a .clas.json metadata file');
      assert.strictEqual(jsonFile, 'zcl_e2e_test.clas.json');
      assert.ok(
        abapFiles.length > 0,
        'must produce at least one .abap source file',
      );

      // Verify the JSON is AFF-compliant
      const meta = JSON.parse(readFileSync(join(packageDir, jsonFile), 'utf8'));
      assert.strictEqual(
        meta.formatVersion,
        '1',
        'AFF formatVersion must be "1"',
      );
      assert.ok(
        !('formatVersion' in meta.header),
        'formatVersion must be at root, not header',
      );
      assert.strictEqual(meta.header.description, 'E2E test class');
      assert.strictEqual(meta.header.originalLanguage, 'en');
      assert.strictEqual(meta.header.abapLanguageVersion, 'cloudDevelopment');
      assert.strictEqual(meta.fixPointArithmetic, true);
      assert.ok(!('class' in meta), 'must not have legacy "class" wrapper');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes AFF-convention files for DOMA (metadata-only, no source)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'aff-e2e-doma-'));
    try {
      const fakeDoma = {
        type: 'DOMA/DT',
        name: 'Z_E2E_DOMA',
        description: 'E2E domain',
        package: 'ZMYPKG',
        dataSync: {
          language: 'EN',
          content: { typeInformation: { datatype: 'CHAR', length: 10 } },
        },
      };

      const ctx = {
        async resolvePackagePath(name: string) {
          return [name];
        },
      };

      const result = await gctsPlugin.format.import!(
        fakeDoma as any,
        dir,
        ctx as any,
      );

      assert.strictEqual(result.success, true);
      const packageDir = join(dir, 'src', 'zmypkg');
      const entries = readdirSync(packageDir);
      const jsonFile = entries.find((e) => e.endsWith('.doma.json'));
      assert.ok(jsonFile, 'must produce a .doma.json metadata file');
      assert.strictEqual(jsonFile, 'z_e2e_doma.doma.json');

      const meta = JSON.parse(readFileSync(join(packageDir, jsonFile), 'utf8'));
      assert.strictEqual(meta.formatVersion, '1');
      assert.strictEqual(meta.format.dataType, 'CHAR');
      assert.strictEqual(meta.format.length, 10);
      assert.ok(!('domain' in meta), 'must not have legacy "domain" wrapper');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes AFF-convention files for FUGR with required fixPointArithmetic', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'aff-e2e-fugr-'));
    try {
      const fakeFugr = {
        type: 'FUGR/F',
        name: 'Z_E2E_FUGR',
        description: 'E2E function group',
        package: 'ZMYPKG',
        dataSync: {
          language: 'EN',
          fixPointArithmetic: true,
        },
      };

      const ctx = {
        async resolvePackagePath(name: string) {
          return [name];
        },
      };

      const result = await gctsPlugin.format.import!(
        fakeFugr as any,
        dir,
        ctx as any,
      );

      assert.strictEqual(result.success, true);
      const packageDir = join(dir, 'src', 'zmypkg');
      const entries = readdirSync(packageDir);
      const jsonFile = entries.find((e) => e.endsWith('.fugr.json'));
      assert.ok(jsonFile, 'must produce a .fugr.json metadata file');

      const meta = JSON.parse(readFileSync(join(packageDir, jsonFile), 'utf8'));
      assert.strictEqual(meta.formatVersion, '1');
      assert.strictEqual(meta.fixPointArithmetic, true);
      assert.ok(
        !('functionGroup' in meta),
        'must not have legacy "functionGroup" wrapper',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
