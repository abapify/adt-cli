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

describe('abapGit reverse package resolution (dir → package name)', () => {
  it('returns root package for empty dir path', () => {
    assert.equal(
      __testing.resolvePackageFromDir('', 'prefix', 'ZABAPGIT_EXAMPLES'),
      'ZABAPGIT_EXAMPLES',
    );
  });

  it('resolves single-level prefix dir to subpackage', () => {
    assert.equal(
      __testing.resolvePackageFromDir('clas', 'prefix', 'ZABAPGIT_EXAMPLES'),
      'ZABAPGIT_EXAMPLES_CLAS',
    );
  });

  it('resolves multi-level prefix dir to nested subpackage', () => {
    assert.equal(
      __testing.resolvePackageFromDir(
        'clas/sub',
        'prefix',
        'ZABAPGIT_EXAMPLES',
      ),
      'ZABAPGIT_EXAMPLES_CLAS_SUB',
    );
  });

  it('resolves full mode dir to package name', () => {
    assert.equal(
      __testing.resolvePackageFromDir(
        'zabapgit_examples_clas',
        'full',
        'ZABAPGIT_EXAMPLES',
      ),
      'ZABAPGIT_EXAMPLES_CLAS',
    );
  });

  it('handles leading/trailing slashes', () => {
    assert.equal(
      __testing.resolvePackageFromDir('/clas/', 'prefix', 'ZABAPGIT_EXAMPLES'),
      'ZABAPGIT_EXAMPLES_CLAS',
    );
  });

  it('round-trips with calculatePackageDir for prefix logic', () => {
    // calculatePackageDir: ['ZROOT', 'ZROOT_CHILD'] → 'child'
    const dir = __testing.calculatePackageDir(
      ['ZROOT', 'ZROOT_CHILD'],
      'prefix',
    );
    // resolvePackageFromDir: 'child' + root 'ZROOT' → 'ZROOT_CHILD'
    const pkg = __testing.resolvePackageFromDir(dir, 'prefix', 'ZROOT');
    assert.equal(pkg, 'ZROOT_CHILD');
  });

  it('round-trips nested prefix paths', () => {
    const dir = __testing.calculatePackageDir(
      ['ZROOT', 'ZROOT_CHILD', 'ZROOT_CHILD_DEEP'],
      'prefix',
    );
    const pkg = __testing.resolvePackageFromDir(dir, 'prefix', 'ZROOT');
    assert.equal(pkg, 'ZROOT_CHILD_DEEP');
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

  it('supports full logic (includes root package as folder)', () => {
    const packageDir = __testing.calculatePackageDir(
      ['ZROOT', 'ZROOT_CHILD', 'ZROOT_CHILD_DEEP'],
      'full',
    );
    assert.equal(packageDir, 'zroot/zroot_child/zroot_child_deep');
  });

  it('supports full logic with real package names', () => {
    const packageDir = __testing.calculatePackageDir(
      ['ZABAPGIT_EXAMPLES', 'ZABAPGIT_EXAMPLES_CLAS'],
      'full',
    );
    assert.equal(packageDir, 'zabapgit_examples/zabapgit_examples_clas');
  });

  it('supports full logic with single root package', () => {
    const packageDir = __testing.calculatePackageDir(
      ['ZABAPGIT_EXAMPLES'],
      'full',
    );
    assert.equal(packageDir, 'zabapgit_examples');
  });
});

describe('DDIC nested package resolution (abapgit-examples restructure)', () => {
  const ddicTypes = ['doma', 'dtel', 'struc', 'tabl', 'ttyp'];

  for (const type of ddicTypes) {
    it(`resolves ddic/${type} to DDIC_${type.toUpperCase()} subpackage`, () => {
      assert.equal(
        __testing.resolvePackageFromDir(
          `ddic/${type}`,
          'prefix',
          'ZABAPGIT_EXAMPLES',
        ),
        `ZABAPGIT_EXAMPLES_DDIC_${type.toUpperCase()}`,
      );
    });
  }

  it('resolves ddic (parent) stays as DDIC subpackage', () => {
    assert.equal(
      __testing.resolvePackageFromDir('ddic', 'prefix', 'ZABAPGIT_EXAMPLES'),
      'ZABAPGIT_EXAMPLES_DDIC',
    );
  });

  it('round-trips ddic/doma through calculatePackageDir', () => {
    const dir = __testing.calculatePackageDir(
      [
        'ZABAPGIT_EXAMPLES',
        'ZABAPGIT_EXAMPLES_DDIC',
        'ZABAPGIT_EXAMPLES_DDIC_DOMA',
      ],
      'prefix',
    );
    assert.equal(dir, 'ddic/doma');

    const pkg = __testing.resolvePackageFromDir(
      dir,
      'prefix',
      'ZABAPGIT_EXAMPLES',
    );
    assert.equal(pkg, 'ZABAPGIT_EXAMPLES_DDIC_DOMA');
  });

  it('round-trips all DDIC type subfolders', () => {
    const types = ['DOMA', 'DTEL', 'STRUC', 'TABL', 'TTYP'];
    for (const type of types) {
      const fullName = `ZABAPGIT_EXAMPLES_DDIC_${type}`;
      const dir = __testing.calculatePackageDir(
        ['ZABAPGIT_EXAMPLES', 'ZABAPGIT_EXAMPLES_DDIC', fullName],
        'prefix',
      );
      const resolved = __testing.resolvePackageFromDir(
        dir,
        'prefix',
        'ZABAPGIT_EXAMPLES',
      );
      assert.equal(
        resolved,
        fullName,
        `Round-trip failed for ${type}: dir='${dir}' resolved='${resolved}'`,
      );
    }
  });
});
