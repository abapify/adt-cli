import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TransportSourceManifest } from '@abapify/adk';
import type { SourceVersionRef } from '@abapify/adt-client';
import type { FormatPlugin } from '@abapify/adt-plugin';
import {
  createAdtFlowService,
  AdtFlowError,
  type FlowCheckoutDependencies,
} from '../src';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function root(): Promise<string> {
  const value = await mkdtemp(join(tmpdir(), 'adt-flow-'));
  roots.push(value);
  return value;
}

function version(
  id: string,
  sourceUri = `/sap/bc/adt/source/${id}`,
): SourceVersionRef {
  return { id, ordinal: 0, sourceUri, transports: [] };
}

function manifest(
  changeKind: 'modified' | 'deleted' | 'added',
  base: SourceVersionRef | undefined,
  head: SourceVersionRef | undefined,
  transport = 'DEVK900001',
): TransportSourceManifest {
  return {
    requestedTransports: [transport],
    scopeTransports: [transport],
    inventory: [
      {
        pgmid: 'R3TR',
        type: 'CLAS',
        name: 'ZCL_SAMPLE',
        wbtype: 'CLAS',
        uri: '/sap/bc/adt/oo/classes/zcl_sample',
        objFunc: '',
        sourceTransport: transport,
      },
    ],
    entries: [
      {
        object: {
          pgmid: 'R3TR',
          type: 'CLAS',
          name: 'ZCL_SAMPLE',
          packageName: 'ZROOT_FEATURE',
        },
        component: { id: 'main' },
        sourceTransport: transport,
        changeKind,
        exact: true,
        ...(base ? { base } : {}),
        ...(head ? { head } : {}),
      },
    ],
  };
}

function unsupportedEntry(
  name = 'PAYHX01',
  sourceTransport = 'DEVK900001',
): TransportSourceManifest['entries'][number] {
  return {
    object: {
      pgmid: 'R3TR',
      type: 'TABD',
      name,
      packageName: 'ZROOT_FEATURE',
    },
    component: { id: 'object' },
    sourceTransport,
    changeKind: 'unsupported',
    exact: false,
    diagnostic: {
      code: 'OBJECT_TYPE_UNSUPPORTED',
      message: 'No source-history loader is registered for this object type.',
    },
  };
}

function unsupportedDiagnosticEntry(): TransportSourceManifest['entries'][number] {
  return {
    ...unsupportedEntry('ZCL_TR_LOAN_CUSTOM_ENTITY FETCH_DATA_LIST'),
    object: {
      pgmid: 'R3TR',
      type: 'METH',
      name: 'ZCL_TR_LOAN_CUSTOM_ENTITY FETCH_DATA_LIST',
      packageName: 'ZROOT_FEATURE',
    },
    changeKind: 'ambiguous',
  };
}

function metadataLoadFailedEntry(
  name = 'PAYHX01',
): TransportSourceManifest['entries'][number] {
  return {
    ...unsupportedEntry(name),
    diagnostic: {
      code: 'OBJECT_METADATA_LOAD_FAILED',
      message: 'SAP ADT rejected repository object metadata retrieval.',
    },
  };
}

const format: FormatPlugin = {
  id: 'abapgit',
  description: 'fixture',
  supportedTypes: ['CLAS'],
  getHandler: () => undefined,
  parseFilename(filename) {
    const match = /^(?<name>.+)\.clas\.(?<extension>abap|xml)$/.exec(filename);
    return match?.groups
      ? {
          name: (match.groups['name'] ?? '').toUpperCase(),
          type: 'CLAS',
          extension: match.groups['extension'] ?? '',
        }
      : undefined;
  },
  async materialize(input) {
    expect(this).toBe(format);
    const object = input.object as { name: string };
    const directory = input.packagePath
      .slice(1)
      .map((part, index) => {
        const parent = input.packagePath[index] ?? '';
        const prefix = `${parent}_`;
        return (
          part.startsWith(prefix) ? part.slice(prefix.length) : part
        ).toLowerCase();
      })
      .join('/');
    const prefix = `src/${directory ? `${directory}/` : ''}${object.name.toLowerCase()}.clas`;
    return {
      files: [
        {
          path: `${prefix}.abap`,
          content: input.sources?.['main'] ?? '',
          role: 'source',
          sourceComponent: 'main',
        },
        {
          path: `${prefix}.xml`,
          content: `<CLASS NAME="${object.name}"/>\n`,
          role: 'metadata',
        },
      ],
    };
  },
};

function dependencies(
  current: () => TransportSourceManifest,
): FlowCheckoutDependencies & {
  buildManifest: ReturnType<typeof vi.fn>;
  readSource: ReturnType<typeof vi.fn>;
  loadObject: ReturnType<typeof vi.fn>;
} {
  return {
    format,
    buildManifest: vi.fn(async () => current()),
    readSource: vi.fn(
      async (selected: SourceVersionRef) => `source ${selected.id}\n`,
    ),
    loadObject: vi.fn(async () => ({
      object: { name: 'ZCL_SAMPLE' },
      packagePath: ['ZROOT', 'ZROOT_FEATURE'],
    })),
  };
}

const config = {
  format: { id: 'abapgit', options: { folderLogic: 'prefix' } },
  include: { objectTypes: ['CLAS'] },
};

describe('transport checkout', () => {
  it('materializes before then head so the workspace contains a real update', async () => {
    const workspace = await root();
    let current = manifest('modified', version('before'), version('after'));
    const ports = dependencies(() => current);
    const flow = createAdtFlowService(ports);

    const base = await flow.checkout({
      root: workspace,
      transports: ['DEVK900001'],
      mode: 'base',
      config,
    });
    expect(
      await readFile(
        join(workspace, 'src/feature/zcl_sample.clas.abap'),
        'utf8',
      ),
    ).toBe('source before\n');
    await expect(
      readFile(join(workspace, '.adt/tr/DEVK900001.json'), 'utf8'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    expect(base.changed).toEqual([
      'src/feature/zcl_sample.clas.abap',
      'src/feature/zcl_sample.clas.xml',
    ]);

    current = manifest('modified', version('before'), version('after'));
    const head = await flow.checkout({
      root: workspace,
      transports: ['DEVK900001'],
      config,
    });
    expect(
      await readFile(
        join(workspace, 'src/feature/zcl_sample.clas.abap'),
        'utf8',
      ),
    ).toBe('source after\n');
    expect(head.changed).toEqual(['src/feature/zcl_sample.clas.abap']);
    expect(head.removed).toEqual([]);
    expect(
      JSON.parse(
        await readFile(join(workspace, '.adt/tr/DEVK900001.json'), 'utf8'),
      ),
    ).not.toHaveProperty('fetchedAt');
  });

  it('repeats an exact released head with zero SAP calls and zero writes', async () => {
    const workspace = await root();
    const ports = dependencies(() =>
      manifest('modified', version('before'), version('after')),
    );
    const flow = createAdtFlowService(ports);
    await flow.checkout({
      root: workspace,
      transports: ['DEVK900001'],
      config,
    });
    ports.buildManifest.mockClear();
    ports.readSource.mockClear();
    ports.loadObject.mockClear();

    const result = await flow.checkout({
      root: workspace,
      transports: ['DEVK900001'],
      config,
    });

    expect(result.fastPath).toBe('exact-head');
    expect(result.changed).toEqual([]);
    expect(result.sapCalls).toEqual({ manifest: 0, metadata: 0, source: 0 });
    expect(ports.buildManifest).not.toHaveBeenCalled();
    expect(ports.readSource).not.toHaveBeenCalled();
    expect(ports.loadObject).not.toHaveBeenCalled();
  });

  it('expands a managed transport descriptor for a cumulative task scope', async () => {
    const workspace = await root();
    let current = manifest(
      'added',
      undefined,
      version('task-one'),
      'DEVK900001',
    );
    const ports = dependencies(() => current);
    const flow = createAdtFlowService(ports);
    await flow.checkout({
      root: workspace,
      transports: ['DEVK900001'],
      config,
    });

    current = {
      ...manifest('added', undefined, version('task-two'), 'DEVK900002'),
      requestedTransports: ['DEVK900001', 'DEVK900002'],
      scopeTransports: ['DEVK900001', 'DEVK900002'],
    };

    await expect(
      flow.checkout({
        root: workspace,
        transports: ['DEVK900001', 'DEVK900002'],
        config,
      }),
    ).resolves.toMatchObject({
      requestedTransports: ['DEVK900001', 'DEVK900002'],
    });
    for (const transport of ['DEVK900001', 'DEVK900002']) {
      expect(
        JSON.parse(
          await readFile(join(workspace, `.adt/tr/${transport}.json`), 'utf8'),
        ).requestedTransports,
      ).toEqual(['DEVK900001', 'DEVK900002']);
    }
  });

  it('persists a complete CTS inventory in one descriptor per request and task', async () => {
    const workspace = await root();
    const current = manifest(
      'modified',
      version('before'),
      version('after'),
      'DEVK900002',
    );
    current.scopeTransports = ['DEVK900001', 'DEVK900002'];
    current.inventory.push({
      pgmid: 'LIMU',
      type: 'ZZZZ',
      name: 'ZUNSUPPORTED',
      wbtype: 'ZZZZ',
      uri: '/sap/bc/adt/repository/informationsystem/objectproperties/values',
      objFunc: '',
      sourceTransport: 'DEVK900002',
    });
    current.entries.push(unsupportedEntry('ZUNSUPPORTED', 'DEVK900002'));

    await createAdtFlowService(dependencies(() => current)).checkout({
      root: workspace,
      transports: ['DEVK900002'],
      config,
    });

    const parent = JSON.parse(
      await readFile(join(workspace, '.adt/tr/DEVK900001.json'), 'utf8'),
    );
    const task = JSON.parse(
      await readFile(join(workspace, '.adt/tr/DEVK900002.json'), 'utf8'),
    );
    expect(parent.inventory).toEqual([]);
    expect(task.inventory).toEqual([
      expect.objectContaining({
        type: 'CLAS',
        name: 'ZCL_SAMPLE',
        sourceTransport: 'DEVK900002',
      }),
      expect.objectContaining({
        type: 'ZZZZ',
        name: 'ZUNSUPPORTED',
        sourceTransport: 'DEVK900002',
      }),
    ]);
  });

  it('rejects the exact-head fast path when a scoped descriptor is missing', async () => {
    const workspace = await root();
    const current = manifest(
      'added',
      undefined,
      version('task-two'),
      'DEVK900002',
    );
    current.scopeTransports = ['DEVK900001', 'DEVK900002'];
    const ports = dependencies(() => current);
    const flow = createAdtFlowService(ports);
    await flow.checkout({
      root: workspace,
      transports: ['DEVK900002'],
      config,
    });
    await rm(join(workspace, '.adt/tr/DEVK900001.json'));
    ports.buildManifest.mockClear();

    const result = await flow.checkout({
      root: workspace,
      transports: ['DEVK900002'],
      config,
    });

    expect(result.fastPath).not.toBe('exact-head');
    expect(ports.buildManifest).toHaveBeenCalledOnce();
    await expect(
      readFile(join(workspace, '.adt/tr/DEVK900001.json'), 'utf8'),
    ).resolves.toContain('DEVK900001');
  });

  it('updates every scoped descriptor during a repeated task-only checkout', async () => {
    const workspace = await root();
    let current = manifest(
      'added',
      undefined,
      version('task-two'),
      'DEVK900002',
    );
    current.scopeTransports = ['DEVK900001', 'DEVK900002'];
    const ports = dependencies(() => current);
    const flow = createAdtFlowService(ports);
    await flow.checkout({
      root: workspace,
      transports: ['DEVK900002'],
      config,
    });

    current = {
      ...current,
      entries: [
        {
          ...current.entries[0]!,
          head: version('task-two-updated'),
        },
      ],
    };
    const taskDescriptorPath = join(workspace, '.adt/tr/DEVK900002.json');
    const taskDescriptor = JSON.parse(
      await readFile(taskDescriptorPath, 'utf8'),
    );
    taskDescriptor.configDigest = '0'.repeat(64);
    await writeFile(taskDescriptorPath, JSON.stringify(taskDescriptor));

    await expect(
      flow.checkout({
        root: workspace,
        transports: ['DEVK900002'],
        config,
      }),
    ).resolves.toMatchObject({ fastPath: 'none' });
    for (const transport of ['DEVK900001', 'DEVK900002']) {
      await expect(
        readFile(join(workspace, `.adt/tr/${transport}.json`), 'utf8'),
      ).resolves.toContain('DEVK900002');
    }
  });

  it('does not overwrite an unrecognized file at a transport descriptor path', async () => {
    const workspace = await root();
    await mkdir(join(workspace, '.adt/tr'), { recursive: true });
    const descriptorPath = join(workspace, '.adt/tr/DEVK900001.json');
    await writeFile(descriptorPath, 'user content\n');
    const flow = createAdtFlowService(
      dependencies(() => manifest('added', undefined, version('task-one'))),
    );

    await expect(
      flow.checkout({
        root: workspace,
        transports: ['DEVK900001'],
        config,
      }),
    ).rejects.toMatchObject({
      code: 'configuration_invalid',
      details: { path: '.adt/tr/DEVK900001.json' },
    });
    expect(await readFile(descriptorPath, 'utf8')).toBe('user content\n');
  });

  it('reuses an indexed component as the base of the next transport', async () => {
    const workspace = await root();
    let current = manifest(
      'modified',
      version('initial'),
      version('indexed'),
      'DEVK900001',
    );
    const ports = dependencies(() => current);
    const flow = createAdtFlowService(ports);
    await flow.checkout({
      root: workspace,
      transports: ['DEVK900001'],
      config,
    });
    ports.readSource.mockClear();
    current = manifest(
      'modified',
      version('indexed'),
      version('next'),
      'DEVK900002',
    );

    const result = await flow.checkout({
      root: workspace,
      transports: ['DEVK900002'],
      mode: 'base',
      config,
    });

    expect(result.fastPath).toBe('indexed-components');
    expect(result.sapCalls).toEqual({ manifest: 1, metadata: 0, source: 0 });
    expect(ports.readSource).not.toHaveBeenCalled();
    expect(ports.loadObject).toHaveBeenCalledTimes(1);
    expect(
      await readFile(
        join(workspace, 'src/feature/zcl_sample.clas.abap'),
        'utf8',
      ),
    ).toBe('source indexed\n');
  });

  it('preserves an indexed object as the base of a later parent-attributed task', async () => {
    const workspace = await root();
    let current = manifest(
      'added',
      undefined,
      version('task-one'),
      'DEVK900001',
    );
    const ports = dependencies(() => current);
    const flow = createAdtFlowService(ports);
    await flow.checkout({
      root: workspace,
      transports: ['DEVK900001'],
      config,
    });
    ports.readSource.mockClear();
    ports.loadObject.mockClear();
    current = manifest('added', undefined, version('task-two'), 'DEVK900002');

    const base = await flow.checkout({
      root: workspace,
      transports: ['DEVK900002'],
      mode: 'base',
      config,
    });

    expect(base.fastPath).toBe('indexed-components');
    expect(base.changed).toEqual([]);
    expect(base.removed).toEqual([]);
    expect(base.sapCalls).toEqual({ manifest: 1, metadata: 0, source: 0 });
    expect(ports.readSource).not.toHaveBeenCalled();
    expect(ports.loadObject).not.toHaveBeenCalled();
    expect(
      await readFile(
        join(workspace, 'src/feature/zcl_sample.clas.abap'),
        'utf8',
      ),
    ).toBe('source task-one\n');

    const head = await flow.checkout({
      root: workspace,
      transports: ['DEVK900002'],
      config,
    });

    expect(head.changed).toEqual(['src/feature/zcl_sample.clas.abap']);
    expect(head.removed).toEqual([]);
    expect(
      await readFile(
        join(workspace, 'src/feature/zcl_sample.clas.abap'),
        'utf8',
      ),
    ).toBe('source task-two\n');
  });

  it('keeps an unindexed recognizable object as an added boundary base', async () => {
    const workspace = await root();
    await mkdir(join(workspace, 'src/feature'), { recursive: true });
    await writeFile(
      join(workspace, 'src/feature/zcl_sample.clas.abap'),
      'repository base\n',
    );
    await writeFile(
      join(workspace, 'src/feature/zcl_sample.clas.xml'),
      '<CLASS NAME="ZCL_SAMPLE"/>\n',
    );
    const ports = dependencies(() =>
      manifest('added', undefined, version('task-head')),
    );
    const flow = createAdtFlowService(ports);

    const base = await flow.checkout({
      root: workspace,
      transports: ['DEVK900001'],
      mode: 'base',
      config,
    });

    expect(base.changed).toEqual([]);
    expect(base.removed).toEqual([]);
    expect(ports.readSource).not.toHaveBeenCalled();
    expect(
      await readFile(
        join(workspace, 'src/feature/zcl_sample.clas.abap'),
        'utf8',
      ),
    ).toBe('repository base\n');
    expect(
      await readFile(
        join(workspace, 'src/feature/zcl_sample.clas.xml'),
        'utf8',
      ),
    ).toBe('<CLASS NAME="ZCL_SAMPLE"/>\n');
    await expect(
      readFile(
        join(workspace, '.adt/objects/CLAS/zcl_sample.clas.adt.json'),
        'utf8',
      ),
    ).rejects.toMatchObject({ code: 'ENOENT' });

    const head = await flow.checkout({
      root: workspace,
      transports: ['DEVK900001'],
      config,
    });

    expect(head.changed).toEqual(['src/feature/zcl_sample.clas.abap']);
    expect(head.removed).toEqual([]);
    expect(
      await readFile(
        join(workspace, 'src/feature/zcl_sample.clas.abap'),
        'utf8',
      ),
    ).toBe('source task-head\n');
  });

  it('shows a first-observed deletion even when no descriptor exists', async () => {
    const workspace = await root();
    await mkdir(join(workspace, 'src/feature'), { recursive: true });
    await writeFile(
      join(workspace, 'src/feature/zcl_sample.clas.abap'),
      'old source\n',
    );
    await writeFile(
      join(workspace, 'src/feature/zcl_sample.clas.xml'),
      '<CLASS/>\n',
    );
    const ports = dependencies(() =>
      manifest('deleted', version('before'), undefined),
    );

    const result = await createAdtFlowService(ports).checkout({
      root: workspace,
      transports: ['DEVK900001'],
      config,
    });

    expect(result.removed).toEqual([
      'src/feature/zcl_sample.clas.abap',
      'src/feature/zcl_sample.clas.xml',
    ]);
    expect(ports.loadObject).not.toHaveBeenCalled();
    expect(
      JSON.parse(
        await readFile(
          join(workspace, '.adt/objects/CLAS/zcl_sample.clas.adt.json'),
          'utf8',
        ),
      ).state,
    ).toBe('deleted');
  });

  it('fails before source reads when an indexed file was edited locally', async () => {
    const workspace = await root();
    const ports = dependencies(() =>
      manifest('modified', version('before'), version('after')),
    );
    const flow = createAdtFlowService(ports);
    await flow.checkout({
      root: workspace,
      transports: ['DEVK900001'],
      mode: 'base',
      config,
    });
    await writeFile(
      join(workspace, 'src/feature/zcl_sample.clas.abap'),
      'local edit\n',
    );
    ports.readSource.mockClear();

    await expect(
      flow.checkout({ root: workspace, transports: ['DEVK900001'], config }),
    ).rejects.toMatchObject({ code: 'working_tree_diverged' });
    expect(ports.readSource).not.toHaveBeenCalled();
    expect(
      await readFile(
        join(workspace, 'src/feature/zcl_sample.clas.abap'),
        'utf8',
      ),
    ).toBe('local edit\n');
  });

  it('validates exactness for the complete scope before any source read', async () => {
    const workspace = await root();
    const current = manifest('modified', version('before'), version('after'));
    current.entries.push({
      object: {
        pgmid: 'R3TR',
        type: 'CLAS',
        name: 'ZCL_ZZZ_INEXACT',
        packageName: 'ZROOT_FEATURE',
      },
      component: { id: 'main' },
      sourceTransport: 'DEVK900001',
      changeKind: 'ambiguous',
      exact: false,
      diagnostic: {
        code: 'SOURCE_HISTORY_SCOPE_VERSION_MISSING',
        message: 'No exact version belongs to the scope.',
      },
    });
    const ports = dependencies(() => current);

    await expect(
      createAdtFlowService(ports).checkout({
        root: workspace,
        transports: ['DEVK900001'],
        config,
      }),
    ).rejects.toMatchObject({ code: 'manifest_inexact' });
    expect(ports.readSource).not.toHaveBeenCalled();
    expect(ports.loadObject).not.toHaveBeenCalled();
  });

  it('materializes the exact subset only when partial mode explicitly opts in', async () => {
    const workspace = await root();
    const current = manifest('modified', version('before'), version('after'));
    current.entries.push({
      object: {
        pgmid: 'R3TR',
        type: 'CLAS',
        name: 'ZCL_ZZZ_INEXACT',
        packageName: 'ZROOT_FEATURE',
      },
      component: { id: 'main' },
      sourceTransport: 'DEVK900001',
      changeKind: 'ambiguous',
      exact: false,
      diagnostic: {
        code: 'SOURCE_HISTORY_INTERVENING_VERSION',
        message: 'A version from another transport occurs inside this scope.',
      },
    });
    const ports = dependencies(() => current);

    const result = await createAdtFlowService(ports).checkout({
      root: workspace,
      transports: ['DEVK900001'],
      config,
      partial: true,
    });

    expect(result.changed).toContain('src/feature/zcl_sample.clas.abap');
    expect(result.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          object: 'CLAS/ZCL_ZZZ_INEXACT',
          component: 'main',
          diagnostic: 'SOURCE_HISTORY_INTERVENING_VERSION',
          sourceTransport: 'DEVK900001',
        }),
      ]),
    );
    const descriptor = JSON.parse(
      await readFile(join(workspace, '.adt/tr/DEVK900001.json'), 'utf8'),
    );
    expect(descriptor.incomplete).toBe(true);
  });

  it('skips unsupported objects while materializing supported objects from the same transport', async () => {
    const workspace = await root();
    const current = manifest('modified', version('before'), version('after'));
    current.entries.push(unsupportedEntry());
    const ports = dependencies(() => current);
    ports.readSource.mockResolvedValue('stable source\n');
    ports.loadObject.mockResolvedValue({
      object: { name: 'ZCL_SAMPLE' },
      packagePath: ['ZROOT', 'ZROOT_FEATURE'],
    });

    const result = await createAdtFlowService(ports).checkout({
      root: workspace,
      transports: ['DEVK900001'],
      config,
    });

    expect(result.skipped).toEqual([
      {
        object: 'TABD/PAYHX01',
        component: 'object',
        diagnostic: 'OBJECT_TYPE_UNSUPPORTED',
        sourceTransport: 'DEVK900001',
      },
    ]);
    expect(result.changed).toContain('src/feature/zcl_sample.clas.abap');
    expect(ports.loadObject).toHaveBeenCalledTimes(1);
  });

  it('skips an unsupported diagnostic even when its manifest change kind is ambiguous', async () => {
    const workspace = await root();
    const current = manifest('modified', version('before'), version('after'));
    current.entries.push(unsupportedDiagnosticEntry());
    const ports = dependencies(() => current);
    ports.readSource.mockResolvedValue('stable source\n');
    ports.loadObject.mockResolvedValue({
      object: { name: 'ZCL_SAMPLE' },
      packagePath: ['ZROOT', 'ZROOT_FEATURE'],
    });

    const result = await createAdtFlowService(ports).checkout({
      root: workspace,
      transports: ['DEVK900001'],
      config,
    });

    expect(result.skipped).toEqual([
      {
        object: 'METH/ZCL_TR_LOAN_CUSTOM_ENTITY FETCH_DATA_LIST',
        component: 'object',
        diagnostic: 'OBJECT_TYPE_UNSUPPORTED',
        sourceTransport: 'DEVK900001',
      },
    ]);
    expect(result.changed).toEqual([
      'src/feature/zcl_sample.clas.abap',
      'src/feature/zcl_sample.clas.xml',
    ]);
    expect(ports.loadObject).toHaveBeenCalledTimes(1);
    expect(ports.readSource).toHaveBeenCalledTimes(1);
  });

  it('reconciles a package reassignment as old-path removal plus new-path writes', async () => {
    const workspace = await root();
    let current = manifest(
      'modified',
      version('old'),
      version('first'),
      'DEVK900001',
    );
    let packagePath = ['ZROOT', 'ZROOT_OLD'];
    const ports = dependencies(() => current);
    ports.readSource.mockImplementation(async () => 'stable source\n');
    ports.loadObject.mockImplementation(async () => ({
      object: { name: 'ZCL_SAMPLE' },
      packagePath,
    }));
    const flow = createAdtFlowService(ports);
    await flow.checkout({
      root: workspace,
      transports: ['DEVK900001'],
      config,
    });

    current = manifest(
      'modified',
      version('first'),
      version('second'),
      'DEVK900002',
    );
    packagePath = ['ZROOT', 'ZROOT_NEW'];
    const result = await flow.checkout({
      root: workspace,
      transports: ['DEVK900002'],
      config,
    });

    await expect(
      readFile(join(workspace, 'src/old/zcl_sample.clas.abap')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    expect(
      await readFile(join(workspace, 'src/new/zcl_sample.clas.abap'), 'utf8'),
    ).toBe('stable source\n');
    expect(result.moved).toEqual([
      {
        from: 'src/old/zcl_sample.clas.abap',
        to: 'src/new/zcl_sample.clas.abap',
      },
      {
        from: 'src/old/zcl_sample.clas.xml',
        to: 'src/new/zcl_sample.clas.xml',
      },
    ]);
    expect(result.changed).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  it('reconstructs the same source tree after the optional index is removed', async () => {
    const workspace = await root();
    const ports = dependencies(() =>
      manifest('modified', version('before'), version('after')),
    );
    const flow = createAdtFlowService(ports);
    await flow.checkout({
      root: workspace,
      transports: ['DEVK900001'],
      config,
    });
    const before = await readFile(
      join(workspace, 'src/feature/zcl_sample.clas.abap'),
      'utf8',
    );
    await rm(join(workspace, '.adt'), { recursive: true, force: true });
    ports.readSource.mockClear();

    const result = await flow.checkout({
      root: workspace,
      transports: ['DEVK900001'],
      config,
    });

    expect(
      await readFile(
        join(workspace, 'src/feature/zcl_sample.clas.abap'),
        'utf8',
      ),
    ).toBe(before);
    expect(result.fastPath).toBe('none');
    expect(ports.readSource).toHaveBeenCalledOnce();
  });

  it('does not remove indexed files for objects excluded by application component', async () => {
    const workspace = await root();
    const current = manifest('modified', version('before'), version('after'));
    const ports = dependencies(() => current);
    const flow = createAdtFlowService(ports);

    await flow.checkout({
      root: workspace,
      transports: ['DEVK900001'],
      config,
    });
    const existing = await readFile(
      join(workspace, 'src/feature/zcl_sample.clas.abap'),
      'utf8',
    );

    ports.loadObject.mockImplementation(async () => ({
      object: { name: 'ZCL_SAMPLE' },
      packagePath: ['ZROOT', 'ZROOT_FEATURE'],
      applicationComponent: 'ZOTHER',
    }));
    const filtered = await flow.checkout({
      root: workspace,
      transports: ['DEVK900001'],
      config: {
        ...config,
        include: { applicationComponents: ['ZAPP'] },
      },
    });

    expect(
      await readFile(
        join(workspace, 'src/feature/zcl_sample.clas.abap'),
        'utf8',
      ),
    ).toBe(existing);
    expect(filtered.removed).toEqual([]);
    expect(filtered.changed).toEqual([]);
    expect(filtered.sapCalls.metadata).toBeGreaterThanOrEqual(1);
  });

  it('does not record unsupported objects excluded by application component', async () => {
    const workspace = await root();
    const current: TransportSourceManifest = {
      requestedTransports: ['DEVK900001'],
      scopeTransports: ['DEVK900001'],
      inventory: [],
      entries: [unsupportedEntry()],
    };
    const ports = dependencies(() => current);
    ports.loadObject.mockResolvedValue({
      object: { name: 'PAYHX01' },
      packagePath: ['ZROOT', 'ZROOT_FEATURE'],
      applicationComponent: 'ZOTHER',
    });

    const result = await createAdtFlowService(ports).checkout({
      root: workspace,
      transports: ['DEVK900001'],
      config: {
        ...config,
        include: { applicationComponents: ['ZAPP'] },
      },
    });

    expect(result.skipped).toEqual([]);
    expect(ports.loadObject).toHaveBeenCalledTimes(1);
  });

  it('skips metadata-load-failed objects without re-loading metadata when an application component filter is configured', async () => {
    const workspace = await root();
    const current: TransportSourceManifest = {
      requestedTransports: ['DEVK900001'],
      scopeTransports: ['DEVK900001'],
      inventory: [],
      entries: [metadataLoadFailedEntry()],
    };
    const ports = dependencies(() => current);
    const result = await createAdtFlowService(ports).checkout({
      root: workspace,
      transports: ['DEVK900001'],
      config: {
        ...config,
        include: { applicationComponents: ['ZAPP'] },
      },
    });

    expect(result.skipped).toEqual([
      {
        object: 'TABD/PAYHX01',
        component: 'object',
        diagnostic: 'OBJECT_METADATA_LOAD_FAILED',
        sourceTransport: 'DEVK900001',
      },
    ]);
    expect(ports.loadObject).not.toHaveBeenCalled();
  });

  it('records unsupported objects in skipped when loadObject fails during application component filtering', async () => {
    const workspace = await root();
    const current: TransportSourceManifest = {
      requestedTransports: ['DEVK900001'],
      scopeTransports: ['DEVK900001'],
      inventory: [],
      entries: [unsupportedEntry()],
    };
    const ports = dependencies(() => current);
    ports.loadObject.mockRejectedValue(
      new AdtFlowError(
        'object_metadata_unavailable',
        'ADT returned an unsupported object metadata model.',
        { object: 'R3TR/TABD/PAYHX01' },
      ),
    );

    const result = await createAdtFlowService(ports).checkout({
      root: workspace,
      transports: ['DEVK900001'],
      config: {
        ...config,
        include: { applicationComponents: ['ZAPP'] },
      },
    });

    expect(result.skipped).toEqual([
      {
        object: 'TABD/PAYHX01',
        component: 'object',
        diagnostic: 'OBJECT_TYPE_UNSUPPORTED',
        sourceTransport: 'DEVK900001',
      },
    ]);
    expect(ports.loadObject).toHaveBeenCalledTimes(1);
  });
});
