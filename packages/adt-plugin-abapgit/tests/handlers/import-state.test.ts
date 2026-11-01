import { afterEach, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { createAdk } from '@abapify/adk';
import type { ImportContext } from '@abapify/adt-plugin';
import { abapGitPlugin } from '../../src/lib/abapgit.ts';

const directories: string[] = [];
function directory() {
  const target = mkdtempSync(join(tmpdir(), 'abapgit-import-state-'));
  directories.push(target);
  return target;
}
function object(name: string) {
  const adk = createAdk({
    adt: {
      oo: {
        classes: {
          source: {
            main: {
              get: async () => `CLASS ${name} DEFINITION PUBLIC. ENDCLASS.`,
            },
          },
        },
      },
    },
  } as never);
  return adk.getWithData(
    { name, language: 'EN', include: [{ includeType: 'main' }] },
    'CLAS',
  );
}
function context(folderLogic: string): ImportContext {
  return {
    resolvePackagePath: async () => ['ZROOT', 'ZROOT_CHILD'],
    formatOptions: { folderLogic },
  };
}
afterEach(() => {
  for (const target of directories.splice(0))
    rmSync(target, { recursive: true, force: true });
});

async function withSrcRootReadCounter<T>(
  srcDir: string,
  action: () => Promise<T>,
): Promise<{ result: T; srcRootReads: number }> {
  const originalReaddirSync = fs.readdirSync;
  let srcRootReads = 0;
  fs.readdirSync = ((...args: Parameters<typeof fs.readdirSync>) => {
    if (resolve(String(args[0])) === srcDir) srcRootReads++;
    return Reflect.apply(originalReaddirSync, fs, args);
  }) as typeof fs.readdirSync;
  syncBuiltinESMExports();

  try {
    return { result: await action(), srcRootReads };
  } finally {
    fs.readdirSync = originalReaddirSync;
    syncBuiltinESMExports();
  }
}

for (const relativeTarget of [false, true]) {
  it(`refreshes a cached cleanup index after an import using ${relativeTarget ? 'relative' : 'absolute'} paths`, async () => {
    const target = directory();
    const owner = { pgmid: 'R3TR', type: 'CLAS', name: 'ZCL_CREATED' };
    const empty = await abapGitPlugin.format.delete!(
      owner,
      target,
      context('prefix'),
    );
    assert.equal(empty.success, true);
    assert.equal(empty.filesRemoved.length, 0);
    const importTarget = relativeTarget
      ? relative(process.cwd(), target)
      : target;
    const imported = await abapGitPlugin.format.import(
      object(owner.name) as never,
      importTarget,
      context('prefix'),
    );
    assert.equal(imported.success, true, imported.errors?.join(', '));
    assert.equal(imported.filesCreated.length, 2);
    const removed = await abapGitPlugin.format.delete!(
      owner,
      target,
      context('prefix'),
    );
    assert.equal(removed.success, true);
    assert.equal(removed.filesRemoved.length, 2);
    for (const file of imported.filesCreated)
      assert.equal(existsSync(file), false);
  });
}

for (const relativeTarget of [false, true]) {
  it(`updates a built src index after imports using ${relativeTarget ? 'relative' : 'absolute'} paths`, async () => {
    const target = directory();
    const srcDir = resolve(target, 'src');
    mkdirSync(srcDir, { recursive: true });
    for (let index = 0; index < 100; index++)
      writeFileSync(
        join(srcDir, `zcl_existing_${index}.clas.abap`),
        'existing source',
      );

    const importTarget = relativeTarget
      ? relative(process.cwd(), target)
      : target;
    const { srcRootReads } = await withSrcRootReadCounter(srcDir, async () => {
      const initialCleanup = await abapGitPlugin.format.delete!(
        { pgmid: 'R3TR', type: 'CLAS', name: 'ZCL_MISSING_INITIAL' },
        target,
        context('prefix'),
      );
      assert.equal(initialCleanup.success, true);
      assert.equal(initialCleanup.filesRemoved.length, 0);

      const importedOwners: string[] = [];
      for (let index = 1; index <= 5; index++) {
        const name = `ZCL_NEW_${index}`;
        const imported = await abapGitPlugin.format.import(
          object(name) as never,
          importTarget,
          context('prefix'),
        );
        assert.equal(imported.success, true, imported.errors?.join(', '));
        assert.equal(imported.filesCreated.length, 2);
        importedOwners.push(name);

        const absentCleanup = await abapGitPlugin.format.delete!(
          { pgmid: 'R3TR', type: 'CLAS', name: `ZCL_MISSING_${index}` },
          target,
          context('prefix'),
        );
        assert.equal(absentCleanup.success, true);
        assert.equal(absentCleanup.filesRemoved.length, 0);
      }

      for (const name of importedOwners) {
        const cleanup = await abapGitPlugin.format.delete!(
          { pgmid: 'R3TR', type: 'CLAS', name },
          target,
          context('prefix'),
        );
        assert.equal(cleanup.success, true);
        assert.equal(cleanup.filesRemoved.length, 2);
      }
    });

    assert.equal(srcRootReads, 1);
    assert.equal(existsSync(join(srcDir, 'zcl_existing_0.clas.abap')), true);
  });
}

it('invalidates the src index after serialization writes a file and fails', async () => {
  const target = directory();
  const srcDir = resolve(target, 'src');
  mkdirSync(srcDir, { recursive: true });
  writeFileSync(join(srcDir, 'zcl_existing.clas.abap'), 'existing source');

  const { srcRootReads } = await withSrcRootReadCounter(srcDir, async () => {
    const owner = { pgmid: 'R3TR', type: 'CLAS', name: 'ZCL_PARTIAL' };
    const initialCleanup = await abapGitPlugin.format.delete!(
      owner,
      target,
      context('prefix'),
    );
    assert.equal(initialCleanup.filesRemoved.length, 0);

    const originalWriteFileSync = fs.writeFileSync;
    const partiallyWritten: string[] = [];
    const instrumentedWriteFileSync = ((
      ...args: Parameters<typeof fs.writeFileSync>
    ) => {
      const result = Reflect.apply(originalWriteFileSync, fs, args);
      const filePath = resolve(String(args[0]));
      if (
        partiallyWritten.length === 0 &&
        filePath.startsWith(`${srcDir}${sep}`)
      ) {
        partiallyWritten.push(filePath);
        throw new Error('fail after first serialized file write');
      }
      return result;
    }) as typeof fs.writeFileSync;
    fs.writeFileSync = instrumentedWriteFileSync;
    syncBuiltinESMExports();

    let failedImport:
      Awaited<ReturnType<typeof abapGitPlugin.format.import>> | undefined;
    try {
      failedImport = await abapGitPlugin.format.import(
        object(owner.name) as never,
        target,
        context('prefix'),
      );
    } finally {
      fs.writeFileSync = originalWriteFileSync;
      syncBuiltinESMExports();
    }

    assert.ok(failedImport);
    assert.equal(failedImport.success, false);
    assert.equal(partiallyWritten.length, 1);
    const partialFile = partiallyWritten[0];
    assert.ok(partialFile);
    assert.equal(existsSync(partialFile), true);

    const cleanup = await abapGitPlugin.format.delete!(
      owner,
      target,
      context('prefix'),
    );
    assert.equal(cleanup.success, true);
    assert.deepEqual(cleanup.filesRemoved, [relative(target, partialFile)]);
    assert.equal(existsSync(partialFile), false);
  });

  assert.equal(srcRootReads, 2);
});

it('drops a completed batch index before a later cleanup observes new files', async () => {
  const target = directory();
  const owner = { pgmid: 'R3TR', type: 'CLAS', name: 'ZCL_LATER' };
  await abapGitPlugin.format.delete!(owner, target, context('prefix'));
  await abapGitPlugin.hooks!.afterImport!(target);
  mkdirSync(join(target, 'src'));
  const file = join(target, 'src/zcl_later.clas.abap');
  writeFileSync(file, 'new source');
  const result = await abapGitPlugin.format.delete!(
    owner,
    target,
    context('prefix'),
  );
  assert.equal(result.success, true);
  assert.equal(result.filesRemoved.length, 1);
  assert.equal(existsSync(file), false);
});

it('keeps each output folder logic when another import finishes before its hook', async () => {
  const full = directory();
  const prefix = directory();
  const imported = await Promise.all([
    abapGitPlugin.format.import(
      object('ZCL_FULL') as never,
      full,
      context('full'),
    ),
    abapGitPlugin.format.import(
      object('ZCL_PREFIX') as never,
      prefix,
      context('prefix'),
    ),
  ]);
  assert.ok(imported.every((result) => result.success));
  await abapGitPlugin.hooks!.afterImport!(full);
  await abapGitPlugin.hooks!.afterImport!(prefix);
  assert.match(
    readFileSync(join(full, '.abapgit.xml'), 'utf8'),
    /<FOLDER_LOGIC>FULL<\/FOLDER_LOGIC>/,
  );
  assert.match(
    readFileSync(join(prefix, '.abapgit.xml'), 'utf8'),
    /<FOLDER_LOGIC>PREFIX<\/FOLDER_LOGIC>/,
  );
  assert.ok(existsSync(join(full, 'src/zroot/zroot_child/zcl_full.clas.abap')));
  assert.ok(existsSync(join(prefix, 'src/child/zcl_prefix.clas.abap')));
});
