import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  symlink,
  readlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { rm } from 'node:fs/promises';
import { parseAbapGitFilename } from '@abapify/adt-plugin-abapgit';
import {
  AdtFlowError,
  createAdtFlowService,
  createCtsDeletionProof,
  digest,
  objectDescriptorPath,
  objectIdentity,
  sha256,
  type FlowCheckoutDependencies,
  type CtsDeletionEvidence,
} from '../src';

const task = 'DEVK900002';
const snapshot = 'DEVK900003';
const paths: string[] = [];
afterEach(async () => {
  await Promise.all(
    paths.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
const row = (
  type = 'PROG',
  name = 'ZDEMO_DELETED',
  objFunc = 'D',
  pgmid = 'R3TR',
) => ({ pgmid, type, name, objFunc, sourceTransport: task });
const evidence = (inventory = [row()]) => ({
  kind: 'inventory' as const,
  task,
  requestedTransports: [task],
  inventory,
});
const copyEvidence = () => ({
  kind: 'snapshot' as const,
  requestedTransports: [task],
  source: {
    number: task,
    status: 'R',
    objectType: 'T',
    objects: [row('PROG', 'ZDEMO_DELETED', '')],
  },
  snapshot: {
    number: snapshot,
    status: 'R',
    objectType: 'R',
    requestType: 'T',
    objects: [row(), row('MERG', task, '', 'CORR')],
  },
});
async function fixture(files: Record<string, string | Buffer> = {}) {
  const root = await mkdtemp(join(tmpdir(), 'flow-cts-deletions-'));
  paths.push(root);
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(root, path, '..'), { recursive: true });
    await writeFile(join(root, path), content);
  }
  const noSap = vi.fn(() => {
    throw new Error('Deletion reconciliation must not acquire SAP source');
  });
  const dependencies: FlowCheckoutDependencies = {
    format: {
      id: 'abapgit',
      description: 'Synthetic format fixture',
      supportedTypes: ['PROG', 'CLAS', 'FUGR', 'DTEL', 'DEVC', 'SMIM'],
      getHandler: () => undefined,
      materialize: async () => {
        throw new Error('Unexpected serialization');
      },
      parseFilename: (name) => parseAbapGitFilename(name) ?? undefined,
    },
    buildManifest: noSap,
    loadObject: noSap,
    readSource: noSap,
  };
  const service = createAdtFlowService(dependencies);
  const apply = (input = evidence(), dryRun = false) =>
    service.reconcileDeletions({
      root,
      evidence: input,
      config: { format: { id: 'abapgit' } },
      dryRun,
    });
  return { root, service, apply, noSap, dependencies };
}
async function owned(
  root: string,
  type: string,
  name: string,
  files: Record<string, string | Buffer>,
) {
  const identity = objectIdentity({ pgmid: 'R3TR', type, name });
  const descriptor = {
    schemaVersion: 1,
    formatVersion: 1,
    identity,
    state: 'present',
    packagePath: ['DEMO'],
    selections: [],
    ownedFiles: Object.entries(files).map(([path, content]) => ({
      path,
      hash: sha256(content),
      role: 'metadata',
    })),
    configDigest: digest({}),
    formatDigest: digest({}),
  };
  const path = objectDescriptorPath(identity);
  await mkdir(join(root, path, '..'), { recursive: true });
  await writeFile(join(root, path), JSON.stringify(descriptor));
  return path;
}

describe('CTS deletion proof', () => {
  it('rejects malformed evidence and unsafe CTS type identities with a typed input error', () => {
    for (const input of [
      null,
      { kind: 'unknown' },
      { ...evidence(), inventory: null },
      evidence([row('../CLAS')]),
    ]) {
      expect(() =>
        createCtsDeletionProof(input as unknown as CtsDeletionEvidence),
      ).toThrow(AdtFlowError);
    }
  });
  it('keeps explicit D independently of unrelated unsupported inventory and does not mutate input', () => {
    const input = evidence([row(), row('UNKN', 'ZDEMO_UNKNOWN', '')]);
    const before = structuredClone(input);
    const proof = createCtsDeletionProof(input);
    expect(proof).toMatchObject({
      schemaVersion: 1,
      sourceTask: task,
      snapshotTransport: task,
      declarations: [row()],
    });
    expect(proof.inventoryDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(input).toEqual(before);
    expect(
      createCtsDeletionProof({
        ...input,
        inventory: [...input.inventory].reverse(),
      }).inventoryDigest,
    ).toBe(proof.inventoryDigest);
  });
  it('accepts descriptive MERG control rows but still requires one exact task origin', () => {
    const input = copyEvidence();
    input.snapshot.objects.unshift(
      row('MERG', 'Copy description without a task identity', '', 'CORR'),
    );
    expect(createCtsDeletionProof(input).sourceTask).toBe(task);
    input.snapshot.objects.push(row('MERG', 'DEVK900004', '', 'CORR'));
    expect(() => createCtsDeletionProof(input)).toThrow(AdtFlowError);
  });
  it('validates a released copy with exact typed origin while original D flags are missing', () => {
    expect(createCtsDeletionProof(copyEvidence())).toMatchObject({
      sourceTask: task,
      snapshotTransport: snapshot,
      declarations: [row()],
    });
  });
  it.each([
    'origin',
    'system',
    'status',
    'type',
    'inventory',
    'duplicate',
    'last-task',
  ])('rejects invalid %s snapshot binding', (field) => {
    const input = copyEvidence();
    if (field === 'origin') input.snapshot.objects[1].name = 'DEVK999999';
    if (field === 'system') input.snapshot.number = 'OTHK900003';
    if (field === 'status') input.snapshot.status = 'D';
    if (field === 'type') input.snapshot.requestType = 'K';
    if (field === 'inventory') input.snapshot.objects[0].name = 'ZDEMO_OTHER';
    if (field === 'duplicate') input.snapshot.objects.push(row());
    if (field === 'last-task') input.requestedTransports.push('DEVK900004');
    expect(() => createCtsDeletionProof(input)).toThrow(AdtFlowError);
  });
  it('rejects out-of-task direct inventory and does not infer D from unavailability', () => {
    expect(() =>
      createCtsDeletionProof(
        evidence([{ ...row(), sourceTransport: 'DEVK900001' }]),
      ),
    ).toThrow(AdtFlowError);
    expect(
      createCtsDeletionProof(evidence([row('PROG', 'ZDEMO_DELETED', '')]))
        .declarations,
    ).toEqual([]);
  });
});

describe('locked deletion reconciliation', () => {
  it('removes program artifacts, records real Git D, preserves unrelated files, then becomes idempotent', async () => {
    const files = {
      'src/demo/zdemo_deleted.prog.abap': 'REPORT zdemo_deleted.\n',
      'src/demo/zdemo_deleted.prog.xml': '<metadata/>\n',
      'src/demo/other.prog.abap': 'keep\n',
    };
    const f = await fixture(files);
    execFileSync('git', ['init', '--quiet'], { cwd: f.root });
    execFileSync('git', ['add', 'src'], { cwd: f.root });
    execFileSync(
      'git',
      [
        '-c',
        'user.name=Fixture',
        '-c',
        'user.email=fixture@example.invalid',
        'commit',
        '--quiet',
        '-m',
        'baseline',
      ],
      { cwd: f.root },
    );
    const result = await f.apply(
      evidence([row(), row('UNKN', 'ZDEMO_UNKNOWN', '')]),
    );
    expect(result.schemaVersion).toBe(1);
    expect(result.removed).toEqual(Object.keys(files).slice(0, 2));
    expect(result.operations[0].outcome).toBe('removed');
    expect(
      execFileSync('git', ['diff', '--name-status'], {
        cwd: f.root,
        encoding: 'utf8',
      })
        .trim()
        .split('\n'),
    ).toEqual(result.removed.map((path) => 'D\t' + path));
    expect(
      await readFile(join(f.root, 'src/demo/other.prog.abap'), 'utf8'),
    ).toBe('keep\n');
    const descriptor = JSON.parse(
      await readFile(
        join(f.root, objectDescriptorPath(objectIdentity(row()))),
        'utf8',
      ),
    );
    expect(descriptor).toMatchObject({
      state: 'deleted',
      ownedFiles: [],
      selections: [],
    });
    const again = await f.apply();
    expect(again.removed).toEqual([]);
    expect(again.operations[0].outcome).toBe('already_absent');
    expect(f.noSap).not.toHaveBeenCalled();
  });
  it.each([
    [
      'CLAS',
      'ZCL_DEMO',
      [
        'clas.abap',
        'clas.xml',
        'clas.locals_imp.abap',
        'clas.testclasses.abap',
      ],
    ],
    ['FUGR', 'ZFG_DEMO', ['fugr.xml', 'fugr.saplzfg_demo.abap']],
    ['DTEL', 'ZDEMO_TYPE', ['dtel.xml']],
    ['PROG', '/DEMO/REPORT', ['prog.abap', 'prog.xml']],
  ])(
    'resolves %s through the selected format instead of a suffix table',
    async (type, name, suffixes) => {
      const files = Object.fromEntries(
        suffixes.map((suffix) => [
          'src/demo/' + name.toLowerCase().replaceAll('/', '#') + '.' + suffix,
          'owned\n',
        ]),
      );
      const f = await fixture(files);
      const r = await f.apply(evidence([row(type, name)]));
      expect(r.removed).toEqual(Object.keys(files).sort());
    },
  );
  it('uses proven filename ownership even if the current serializer registry lacks the type', async () => {
    const file = 'src/demo/zdemo_deleted.sxsd.xml';
    const f = await fixture({ [file]: '<serialized/>' });
    expect(f.dependencies.format.supportedTypes).not.toContain('SXSD');
    const result = await f.apply(evidence([row('SXSD')]));
    expect(result.removed).toEqual([file]);
    expect(result.operations[0].outcome).toBe('removed');
  });
  it('does not claim unsupported unobserved objects are already absent', async () => {
    const f = await fixture({ 'src/demo/keep.prog.abap': 'keep' });
    const result = await f.apply(evidence([row('UNKN')]));
    expect(result.removed).toEqual([]);
    expect(result.operations[0]).toMatchObject({
      outcome: 'unapplied',
      diagnostic: 'CTS_DELETE_TYPE_UNSUPPORTED',
    });
  });
  it('deletes only indexed package metadata, preserving all child source', async () => {
    const file = 'src/demo/package.devc.xml';
    const f = await fixture({
      [file]: '<package/>',
      'src/demo/zcl_keep.clas.abap': 'keep',
    });
    await owned(f.root, 'DEVC', 'ZDEMO', { [file]: '<package/>' });
    expect((await f.apply(evidence([row('DEVC', 'ZDEMO')]))).removed).toEqual([
      file,
    ]);
    expect(
      await readFile(join(f.root, 'src/demo/zcl_keep.clas.abap'), 'utf8'),
    ).toBe('keep');
  });
  it('reports component and unknown package ownership without deleting owner source', async () => {
    const f = await fixture({
      'src/demo/zcl_demo.clas.abap': 'keep',
      'src/demo/package.devc.xml': '<keep/>',
    });
    const r = await f.apply(
      evidence([
        row('METH', 'ZCL_DEMO                     METHOD', 'D', 'LIMU'),
        row('DEVC', 'ZDEMO'),
      ]),
    );
    expect(r.removed).toEqual([]);
    expect(r.operations.map((op) => op.outcome)).toEqual([
      'unapplied',
      'unapplied',
    ]);
    expect(
      await readFile(join(f.root, 'src/demo/zcl_demo.clas.abap'), 'utf8'),
    ).toBe('keep');
  });
  it('preserves indexed source modified since ownership was recorded', async () => {
    const file = 'src/demo/zdemo_deleted.prog.abap';
    const f = await fixture({ [file]: 'modified' });
    const descriptor = await owned(f.root, 'PROG', 'ZDEMO_DELETED', {
      [file]: 'original',
    });
    const original = await readFile(join(f.root, descriptor));
    const r = await f.apply();
    expect(r.operations[0]).toMatchObject({
      outcome: 'unapplied',
      diagnostic: 'CTS_DELETE_FILE_DIVERGED',
    });
    expect(r.removed).toEqual([]);
    expect(await readFile(join(f.root, file), 'utf8')).toBe('modified');
    expect(await readFile(join(f.root, descriptor))).toEqual(original);
  });
  it('dry run reports planned files without writing source or a tombstone', async () => {
    const file = 'src/demo/zdemo_deleted.prog.abap';
    const f = await fixture({ [file]: 'keep' });
    const r = await f.apply(evidence(), true);
    expect(r.planned).toEqual([file]);
    expect(r.removed).toEqual([]);
    expect(r.dryRun).toBe(true);
    expect(await readFile(join(f.root, file), 'utf8')).toBe('keep');
    await expect(
      readFile(join(f.root, objectDescriptorPath(objectIdentity(row())))),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('rejects indexed paths escaping src and symbolic links before any source mutation', async () => {
    const file = 'src/demo/zdemo_deleted.prog.abap';
    const f = await fixture({ outside: 'keep', [file]: 'old' });
    await owned(f.root, 'PROG', 'ZDEMO_DELETED', { outside: 'keep' });
    await expect(f.apply()).rejects.toMatchObject({ code: 'path_invalid' });
    await owned(f.root, 'PROG', 'ZDEMO_DELETED', { [file]: 'old' });
    await rm(join(f.root, file));
    await symlink(join(f.root, 'outside'), join(f.root, file));
    await expect(f.apply()).rejects.toMatchObject({ code: 'path_invalid' });
    expect(await readFile(join(f.root, 'outside'), 'utf8')).toBe('keep');
  });
  it('invalidates an older transport fast path after independently proven deletion', async () => {
    const file = 'src/demo/zdemo_deleted.prog.abap';
    const f = await fixture({ [file]: 'old' });
    const object = await owned(f.root, 'PROG', 'ZDEMO_DELETED', {
      [file]: 'old',
    });
    const config = { format: { id: 'abapgit' } };
    const configDigest = digest(config);
    const formatDigest = digest({
      id: 'abapgit',
      options: {},
      supportedTypes: [...f.dependencies.format.supportedTypes].sort(),
    });
    await mkdir(join(f.root, '.adt/tr'), { recursive: true });
    await writeFile(
      join(f.root, '.adt/tr/' + task + '.json'),
      JSON.stringify({
        schemaVersion: 1,
        requestedTransports: [task],
        scopeTransports: [task],
        inventory: [row('PROG', 'ZDEMO_DELETED', '')],
        objects: [object],
        configDigest,
        formatDigest,
      }),
    );
    await f.apply();
    f.noSap.mockClear();
    try {
      await f.service.checkout({ root: f.root, transports: [task], config });
    } catch {
      /* The forbidden acquisition marker is expected after index invalidation. */
    }
    expect(f.noSap).toHaveBeenCalledOnce();
  });
  it('rejects a dangling owned symlink before applying any source deletion or tombstone', async () => {
    const file = 'src/demo/zdemo_deleted.prog.abap';
    const regular = 'src/demo/za_first.prog.abap';
    const f = await fixture({ [regular]: 'preserve' });
    const target = join(f.root, 'src/demo/missing.prog.abap');
    await symlink(target, join(f.root, file));
    await expect(
      f.apply(evidence([row('PROG', 'ZA_FIRST'), row()])),
    ).rejects.toMatchObject({ code: 'path_invalid' });
    expect(await readlink(join(f.root, file))).toBe(target);
    expect(await readFile(join(f.root, regular), 'utf8')).toBe('preserve');
    await expect(
      readFile(
        join(
          f.root,
          objectDescriptorPath(objectIdentity(row('PROG', 'ZA_FIRST'))),
        ),
      ),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('removes indexed binary companions using byte hashes', async () => {
    const file = 'src/demo/zdemo_deleted.smim.bin';
    const data = Buffer.from([0, 255, 128, 1]);
    const f = await fixture({ [file]: data });
    await owned(f.root, 'SMIM', 'ZDEMO_DELETED', { [file]: data });
    expect((await f.apply(evidence([row('SMIM')]))).removed).toEqual([file]);
  });
});
