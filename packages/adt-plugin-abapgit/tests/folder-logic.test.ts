import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ImportContext } from '@abapify/adt-plugin';
import { __testing } from '../src/lib/abapgit.ts';

function createImportContext(
  overrides: Partial<ImportContext> = {},
): ImportContext {
  return {
    resolvePackagePath: async () => ['ZROOT'],
    ...overrides,
  };
}

const tempDirs: string[] = [];
function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'abapgit-folder-logic-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('abapGit folder logic resolution', () => {
  it('prefers CLI format option over repository and config values', () => {
    const dir = createTempDir();
    writeFileSync(
      join(dir, '.abapgit.xml'),
      __testing.generateAbapGitXml('prefix'),
      'utf-8',
    );

    const folderLogic = __testing.resolveFolderLogic(
      createImportContext({
        formatOptions: { folderLogic: 'full-with-root' },
        configFormatOptions: { folderLogic: 'prefix' },
      }),
      dir,
    );

    assert.equal(folderLogic, 'full-with-root');
  });

  it('uses existing .abapgit.xml before config defaults', () => {
    const dir = createTempDir();
    writeFileSync(
      join(dir, '.abapgit.xml'),
      __testing.generateAbapGitXml('full'),
      'utf-8',
    );

    const folderLogic = __testing.resolveFolderLogic(
      createImportContext({
        configFormatOptions: { folderLogic: 'prefix' },
      }),
      dir,
    );

    assert.equal(folderLogic, 'full');
  });

  it('uses config default when repository metadata is absent', () => {
    const dir = createTempDir();
    const folderLogic = __testing.resolveFolderLogic(
      createImportContext({
        configFormatOptions: { folderLogic: 'full' },
      }),
      dir,
    );

    assert.equal(folderLogic, 'full');
  });

  it('falls back to prefix for unknown values', () => {
    const dir = createTempDir();
    const folderLogic = __testing.resolveFolderLogic(
      createImportContext({
        formatOptions: { folderLogic: 'unknown-mode' },
        configFormatOptions: { folderLogic: 'invalid' },
      }),
      dir,
    );

    assert.equal(folderLogic, 'prefix');
  });
});

describe('abapGit package directory mapping', () => {
  it('supports prefix logic', () => {
    const packageDir = __testing.calculatePackageDir(
      ['ZROOT', 'ZROOT_CHILD', 'ZROOT_CHILD_DEEP'],
      'prefix',
    );
    assert.equal(packageDir, 'child/deep');
  });

  it('supports full logic', () => {
    const packageDir = __testing.calculatePackageDir(
      ['ZROOT', 'ZROOT_CHILD', 'ZROOT_CHILD_DEEP'],
      'full',
    );
    assert.equal(packageDir, 'zroot_child/zroot_child_deep');
  });
});
