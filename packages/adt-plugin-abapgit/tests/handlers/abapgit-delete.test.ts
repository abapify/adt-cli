/**
 * Tests for abapGit plugin format.delete()
 *
 * Verifies that format.delete() correctly removes abapGit files for a given
 * object type/name from the target directory.
 */

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ImportContext } from '@abapify/adt-plugin';

// Import the plugin (which registers itself)
import { abapGitPlugin } from '../../src/lib/abapgit.ts';

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'abapgit-delete-'));
  tempDirs.push(dir);
  return dir;
}

function createImportContext(): ImportContext {
  return {
    resolvePackagePath: async () => ['ZROOT'],
  };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('abapgit format.delete()', () => {
  it('should be defined on the plugin', () => {
    assert.ok(
      typeof abapGitPlugin.format.delete === 'function',
      'format.delete must be a function',
    );
  });

  it('should remove matching abapgit files for a TABL object', async () => {
    const targetPath = createTempDir();
    const srcDir = join(targetPath, 'src');
    mkdirSync(srcDir, { recursive: true });

    // Create mock abapgit files for ZTABL_DEL
    writeFileSync(join(srcDir, 'ztabl_del.tabl.xml'), '<tabl/>');

    assert.ok(existsSync(join(srcDir, 'ztabl_del.tabl.xml')));

    const ctx = createImportContext();
    const result = await abapGitPlugin.format.delete!(
      { pgmid: 'R3TR', type: 'TABL', name: 'ZTABL_DEL' },
      targetPath,
      ctx,
    );

    assert.ok(result.success, 'delete should succeed');
    assert.strictEqual(result.filesRemoved.length, 1);
    assert.ok(result.filesRemoved[0]!.includes('ztabl_del.tabl.xml'));
    assert.ok(
      !existsSync(join(srcDir, 'ztabl_del.tabl.xml')),
      'file should be removed',
    );
  });

  it('should remove multiple files for a CLAS object (xml + abap)', async () => {
    const targetPath = createTempDir();
    const srcDir = join(targetPath, 'src');
    mkdirSync(srcDir, { recursive: true });

    // Create mock abapgit files for ZCL_EXAMPLE
    writeFileSync(join(srcDir, 'zcl_example.clas.xml'), '<clas/>');
    writeFileSync(join(srcDir, 'zcl_example.clas.abap'), 'CLASS zcl_example.');
    writeFileSync(join(srcDir, 'zcl_example.clas.testclasses.abap'), '');

    const ctx = createImportContext();
    const result = await abapGitPlugin.format.delete!(
      { pgmid: 'R3TR', type: 'CLAS', name: 'ZCL_EXAMPLE' },
      targetPath,
      ctx,
    );

    assert.ok(result.success, 'delete should succeed');
    assert.strictEqual(result.filesRemoved.length, 3);
    assert.ok(!existsSync(join(srcDir, 'zcl_example.clas.xml')));
    assert.ok(!existsSync(join(srcDir, 'zcl_example.clas.abap')));
    assert.ok(!existsSync(join(srcDir, 'zcl_example.clas.testclasses.abap')));
  });

  it('should succeed with empty filesRemoved when object not on disk', async () => {
    const targetPath = createTempDir();
    mkdirSync(join(targetPath, 'src'), { recursive: true });

    const ctx = createImportContext();
    const result = await abapGitPlugin.format.delete!(
      { pgmid: 'R3TR', type: 'TABL', name: 'ZNEVER_EXISTED' },
      targetPath,
      ctx,
    );

    assert.ok(result.success, 'delete should succeed even when no files found');
    assert.strictEqual(result.filesRemoved.length, 0);
  });

  it('should not delete files of other objects with similar names', async () => {
    const targetPath = createTempDir();
    const srcDir = join(targetPath, 'src');
    mkdirSync(srcDir, { recursive: true });

    // The target object
    writeFileSync(join(srcDir, 'ztabl_del.tabl.xml'), '<tabl/>');
    // A different object that starts similarly
    writeFileSync(join(srcDir, 'ztabl_del_ext.tabl.xml'), '<tabl2/>');

    const ctx = createImportContext();
    const result = await abapGitPlugin.format.delete!(
      { pgmid: 'R3TR', type: 'TABL', name: 'ZTABL_DEL' },
      targetPath,
      ctx,
    );

    assert.ok(result.success);
    assert.strictEqual(result.filesRemoved.length, 1);
    // The other file must still exist
    assert.ok(
      existsSync(join(srcDir, 'ztabl_del_ext.tabl.xml')),
      'unrelated file should not be removed',
    );
  });

  it('should find files in subdirectories (package sub-folders)', async () => {
    const targetPath = createTempDir();
    const srcDir = join(targetPath, 'src');
    const subDir = join(srcDir, 'zpackage', 'sub');
    mkdirSync(subDir, { recursive: true });

    writeFileSync(join(subDir, 'zprog_deep.prog.xml'), '<prog/>');
    writeFileSync(join(subDir, 'zprog_deep.prog.abap'), 'REPORT zprog_deep.');

    const ctx = createImportContext();
    const result = await abapGitPlugin.format.delete!(
      { pgmid: 'R3TR', type: 'PROG', name: 'ZPROG_DEEP' },
      targetPath,
      ctx,
    );

    assert.ok(result.success);
    assert.strictEqual(result.filesRemoved.length, 2);
    assert.ok(!existsSync(join(subDir, 'zprog_deep.prog.xml')));
    assert.ok(!existsSync(join(subDir, 'zprog_deep.prog.abap')));
  });
});
