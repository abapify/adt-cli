import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AbapGitSerializer } from '../src/lib/serializer.ts';
import '../src/lib/handlers/objects/index.ts';

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'abapgit-serializer-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('AbapGitSerializer', () => {
  it('writes namespaced BDEF files below the target directory', async () => {
    const targetPath = createTempDir();
    const serializer = new AbapGitSerializer();

    const written = await serializer.serializeObjectPublic(
      {
        name: '/ACR/BEHAVIOR',
        type: 'BDEF',
        kind: 'BehaviorDefinition',
        getSource: async () =>
          'managed implementation in class zbp_acr unique;',
      } as never,
      targetPath,
      '',
    );

    assert.deepEqual(
      written.map((file) => file.slice(join(targetPath, 'src').length + 1)),
      ['acr/behavior.bdef.abdl', 'acr/behavior.bdef.json'],
    );
    assert.ok(existsSync(join(targetPath, 'src', 'acr', 'behavior.bdef.abdl')));
    assert.ok(existsSync(join(targetPath, 'src', 'acr', 'behavior.bdef.json')));
  });
});
