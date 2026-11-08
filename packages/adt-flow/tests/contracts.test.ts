import { describe, expect, it } from 'vitest';
import {
  encodeObjectName,
  flowConfigSchema,
  objectDescriptorPath,
  objectIdentity,
  objectDescriptorSchema,
} from '../src';
import {
  findDivergedOwnedPath,
  planRepositoryChanges,
  safeRelativePath,
} from '../src/repository';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';

import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('flow contracts', () => {
  it('normalizes a deterministic bounded config', () => {
    expect(
      flowConfigSchema.parse({
        format: { id: 'abapgit' },
        concurrency: { metadata: 1, sources: 32 },
      }),
    ).toMatchObject({ format: { id: 'abapgit' } });
    expect(() =>
      flowConfigSchema.parse({
        format: { id: 'abapgit' },
        concurrency: { sources: 33 },
      }),
    ).toThrow();
  });

  it('keeps safe names readable and encodes namespace names reversibly', () => {
    expect(encodeObjectName('ZCL_SAMPLE')).toBe('zcl_sample');
    expect(encodeObjectName('/ACME/CL_SAMPLE')).toMatch(/^~/);
    expect(encodeObjectName('/ACME/CL_SAMPLE')).not.toContain('/');
  });

  it('creates a unique descriptor path within an explicit type directory', () => {
    expect(
      objectDescriptorPath(
        objectIdentity({ pgmid: 'R3TR', type: 'CLAS', name: 'ZCL_SAMPLE' }),
      ),
    ).toBe('.adt/objects/CLAS/zcl_sample.clas.adt.json');
  });

  it('rejects unknown descriptor schema versions and unsafe paths', () => {
    expect(objectDescriptorSchema.safeParse({ schemaVersion: 2 }).success).toBe(
      false,
    );
    expect(() => safeRelativePath('../outside')).toThrow();
    expect(() => safeRelativePath('src\\outside')).toThrow();
  });

  it('rejects portable case collisions before writes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'adt-flow-contract-'));
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, 'src/ZCL_SAMPLE.clas.abap'), 'existing');
      await expect(
        planRepositoryChanges(
          root,
          [
            {
              path: 'src/zcl_sample.clas.abap',
              content: 'desired',
              role: 'source',
              sourceComponent: 'main',
              owner: 'R3TR/CLAS/ZCL_SAMPLE',
            },
          ],
          new Set(),
        ),
      ).rejects.toMatchObject({ code: 'path_collision' });
      expect(
        await readFile(join(root, 'src/ZCL_SAMPLE.clas.abap'), 'utf8'),
      ).toBe('existing');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('reports the first owned path whose recorded content no longer matches', async () => {
    const root = await mkdtemp(join(tmpdir(), 'adt-flow-contract-'));
    try {
      await writeFile(join(root, 'owned.txt'), 'changed');
      await expect(
        findDivergedOwnedPath(root, [
          { path: 'owned.txt', hash: 'recorded-hash' },
        ]),
      ).resolves.toBe('owned.txt');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
