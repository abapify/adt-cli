import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { TransportSourceManifest } from '@abapify/adk';
import { abapgitFormatPlugin } from '@abapify/adt-plugin-abapgit';
import { createAdtFlowService } from '../src/service';

const workspaces: string[] = [];
afterEach(async () => {
  await Promise.all(
    workspaces
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});
const components = [
  'main',
  'definitions',
  'implementations',
  'macros',
  'testclasses',
];
const suffixes = ['', '.locals_def', '.locals_imp', '.macros', '.testclasses'];

async function fixture(name = 'ZCL_DEMO') {
  const root = await mkdtemp(join(tmpdir(), 'flow-preserve-class-'));
  workspaces.push(root);
  const filename = name.toLowerCase().replaceAll('/', '#');
  const main = (method: boolean) =>
    `CLASS ${name.toLowerCase()} DEFINITION PUBLIC. PUBLIC SECTION. ${method ? 'CLASS-METHODS get_items.' : ''} ENDCLASS.\nCLASS ${name.toLowerCase()} IMPLEMENTATION. ${method ? 'METHOD get_items. ENDMETHOD.' : ''} ENDCLASS.\n`;
  const oldSources = Object.fromEntries(
    components.map((component) => [
      component,
      component === 'main' ? main(false) : `* existing ${component}\n`,
    ]),
  );
  let sources: Record<string, string> = { ...oldSources };
  let selected = [...components];
  let deleted: string[] = [];
  let added: string[] = [];
  let mode: 'base' | 'head' = 'head';
  let packagePath = ['ZROOT'];
  let transport = 'DEVK900101';
  let versionId = '00002';
  const object = {
    name,
    dataSync: {
      name,
      language: 'EN',
      include: components.map((includeType) => ({ includeType })),
    },
    getIncludeSource: async () => {
      throw new Error('Mutable include source must not be read');
    },
  };
  const config = { format: { id: 'abapgit' } };
  const file = (component: string, directory = '') =>
    join(
      root,
      'src',
      directory,
      `${filename}.clas${suffixes[components.indexOf(component)]}.abap`,
    );
  const manifest = (): TransportSourceManifest => {
    const identity = {
      pgmid: 'R3TR',
      type: 'CLAS',
      name,
      packageName: packagePath.at(-1)!,
    };
    const inventory = [
      {
        pgmid: 'R3TR',
        type: 'CLAS',
        name,
        objFunc: deleted.includes('main') ? 'D' : '',
        sourceTransport: transport,
      },
    ];
    return {
      requestedTransports: [transport],
      scopeTransports: [transport],
      inventory,
      inventoryResolutions: [
        {
          outcome: 'resolved',
          object: identity,
          repositoryObject: identity,
          sourceTransport: transport,
        },
      ],
      entries: selected.map((component) => ({
        object: identity,
        component: { id: component },
        sourceTransport: transport,
        changeKind: deleted.includes(component)
          ? 'deleted'
          : added.includes(component)
            ? 'added'
            : 'modified',
        exact: true,
        ...(added.includes(component)
          ? {}
          : {
              base: {
                id: '00001',
                ordinal: 1,
                sourceUri: `/fixture/${component}/00001`,
                transports: [],
              },
            }),
        ...(deleted.includes(component)
          ? {}
          : {
              head: {
                id: versionId,
                ordinal: 0,
                sourceUri: `/fixture/${component}/${versionId}`,
                transports: [transport],
              },
            }),
      })),
    };
  };
  const flow = createAdtFlowService({
    format: abapgitFormatPlugin,
    buildManifest: async () => manifest(),
    readSource: async (version) => sources[version.sourceUri.split('/')[2]],
    loadObject: async () => ({ object, packagePath }),
  });
  const seed = async (indexed: boolean) => {
    if (indexed) await flow.checkout({ root, transports: [transport], config });
    else {
      if (!abapgitFormatPlugin.materialize)
        throw new Error('Fixture materializer missing');
      const output = await abapgitFormatPlugin.materialize({
        object,
        objectType: 'CLAS',
        packagePath,
        sources: oldSources,
      });
      for (const entry of output.files) {
        await mkdir(dirname(join(root, entry.path)), { recursive: true });
        await writeFile(join(root, entry.path), entry.content);
      }
    }
    await writeFile(
      join(root, 'src/unrelated.prog.abap'),
      'REPORT unrelated.\n',
    );
    const git = (...args: string[]) =>
      execFileSync('git', ['-C', root, ...args], { stdio: 'ignore' });
    git('init', '--initial-branch=main');
    git('config', 'user.name', 'Fixture');
    git('config', 'user.email', 'fixture@example.invalid');
    git('add', 'src');
    git('commit', '-m', 'existing canonical source');
  };
  const checkout = async (
    selection = ['main'],
    remove: string[] = [],
    move = false,
    partial = true,
  ) => {
    selected = selection;
    deleted = remove;
    transport = 'DEVK900102';
    versionId = '00003';
    sources = {
      ...oldSources,
      main: main(true),
      implementations: '* new implementation\n',
    };
    if (move) packagePath = ['ZROOT', 'ZROOT_NEW'];
    return flow.checkout({
      root,
      transports: [transport],
      config,
      partial,
      mode,
    });
  };
  const baseBeforeAddition = () => {
    mode = 'base';
    added = ['implementations'];
    return checkout(['implementations']);
  };
  return {
    baseBeforeAddition,
    root,
    filename,
    file,
    seed,
    checkout,
    oldSources,
    main,
  };
}

describe('class component preservation in an existing repository', () => {
  it.each([
    { indexed: false, partial: false },
    { indexed: true, partial: false },
    { indexed: false, partial: true },
    { indexed: true, partial: true },
  ])(
    'preserves every unselected companion when updating main ($indexed, $partial)',
    async ({ indexed, partial }) => {
      const f = await fixture();
      await f.seed(indexed);
      const result = await f.checkout(['main'], [], false, partial);
      expect(await readFile(f.file('main'), 'utf8')).toBe(f.main(true));
      for (const component of components.slice(1))
        expect(await readFile(f.file(component), 'utf8')).toBe(
          f.oldSources[component],
        );
      expect(
        await readFile(join(f.root, 'src/unrelated.prog.abap'), 'utf8'),
      ).toBe('REPORT unrelated.\n');
      expect(result.removed).toEqual([]);
      expect(result.skipped).toEqual([]);
      const descriptor = JSON.parse(
        await readFile(
          join(
            f.root,
            result.descriptors.find((path) => path.endsWith('.clas.adt.json'))!,
          ),
          'utf8',
        ),
      );
      expect(
        descriptor.ownedFiles.filter(
          (file: { role: string }) => file.role === 'source',
        ),
      ).toHaveLength(5);
      expect(descriptor.selections).toEqual(
        expect.arrayContaining(
          (indexed ? components : ['main']).map((component) => ({
            component,
            versionId: component === 'main' ? '00003' : '00002',
            sourceUri: `/fixture/${component}/${component === 'main' ? '00003' : '00002'}`,
          })),
        ),
      );
      expect(descriptor.selections).toHaveLength(indexed ? 5 : 1);
    },
  );

  it('can subsequently select a formerly preserved component without an ownership collision', async () => {
    const f = await fixture();
    await f.seed(false);
    await f.checkout();
    await f.checkout(['implementations']);
    expect(await readFile(f.file('implementations'), 'utf8')).toBe(
      '* new implementation\n',
    );
    expect(await readFile(f.file('main'), 'utf8')).toBe(f.main(true));
    expect(await readFile(f.file('definitions'), 'utf8')).toBe(
      f.oldSources['definitions'],
    );
  });

  it('removes an explicitly deleted component while preserving the remaining components', async () => {
    const f = await fixture();
    await f.seed(false);
    const result = await f.checkout(
      ['main', 'implementations'],
      ['implementations'],
    );
    await expect(readFile(f.file('implementations'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    expect(result.removed).toEqual(['src/zcl_demo.clas.locals_imp.abap']);
    for (const component of ['definitions', 'macros', 'testclasses'])
      expect(await readFile(f.file(component), 'utf8')).toBe(
        f.oldSources[component],
      );
  });

  it.each([false, true])(
    'deletes only a selected companion when no component is present (indexed=%s)',
    async (indexed) => {
      const f = await fixture();
      await f.seed(indexed);
      const result = await f.checkout(['implementations'], ['implementations']);
      expect(result.removed).toEqual(['src/zcl_demo.clas.locals_imp.abap']);
      await expect(readFile(f.file('implementations'))).rejects.toMatchObject({
        code: 'ENOENT',
      });
      for (const component of ['main', 'definitions', 'macros', 'testclasses'])
        expect(await readFile(f.file(component), 'utf8')).toBe(
          f.oldSources[component],
        );
    },
  );

  it.each([false, true])(
    'keeps the class when a selected companion is absent before its addition (indexed=%s)',
    async (indexed) => {
      const f = await fixture();
      await f.seed(indexed);
      const result = await f.baseBeforeAddition();
      expect(result.removed).toEqual(['src/zcl_demo.clas.locals_imp.abap']);
      await expect(readFile(f.file('implementations'))).rejects.toMatchObject({
        code: 'ENOENT',
      });
      for (const component of ['main', 'definitions', 'macros', 'testclasses'])
        expect(await readFile(f.file(component), 'utf8')).toBe(
          f.oldSources[component],
        );
    },
  );

  it('does not preserve a selected deletion with an uppercase legacy suffix', async () => {
    const f = await fixture();
    await f.seed(false);
    const uppercase = f
      .file('implementations')
      .replace('locals_imp', 'LOCALS_IMP');
    await rename(f.file('implementations'), uppercase);
    await f.checkout(['main', 'implementations'], ['implementations']);
    await expect(readFile(uppercase)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readFile(f.file('main'), 'utf8')).toBe(f.main(true));
    expect(await readFile(f.file('definitions'), 'utf8')).toBe(
      f.oldSources['definitions'],
    );
  });

  it('rejects an indexed symlink before copying its target into a relocated class', async () => {
    const f = await fixture();
    await f.seed(true);
    const secret = join(f.root, 'sensitive-input.txt');
    await writeFile(secret, f.oldSources['implementations']);
    await rm(f.file('implementations'));
    await symlink('../sensitive-input.txt', f.file('implementations'));
    await expect(f.checkout(['main'], [], true)).rejects.toMatchObject({
      code: 'path_invalid',
    });
    expect(await readFile(secret, 'utf8')).toBe(
      f.oldSources['implementations'],
    );
    expect(await readFile(f.file('main'), 'utf8')).toBe(f.main(false));
    await expect(
      readFile(f.file('implementations', 'new')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it.each([false, true])(
    'rejects case-variant duplicate companions before writes (indexed=%s)',
    async (indexed) => {
      const f = await fixture();
      await f.seed(indexed);
      const relative = 'src/zcl_demo.clas.LOCALS_DEF.abap';
      const duplicate = join(f.root, relative);
      const bytes = '* conflicting definition\n';
      await writeFile(duplicate, bytes);
      if (indexed) {
        const path = join(f.root, '.adt/objects/CLAS/zcl_demo.clas.adt.json');
        const descriptor = JSON.parse(await readFile(path, 'utf8'));
        descriptor.ownedFiles.push({
          path: relative,
          hash: createHash('sha256').update(bytes).digest('hex'),
          role: 'source',
          sourceComponent: 'definitions',
        });
        await writeFile(path, JSON.stringify(descriptor));
      }
      await expect(f.checkout()).rejects.toMatchObject({
        code: 'path_collision',
      });
      expect(await readFile(f.file('main'), 'utf8')).toBe(f.main(false));
      expect(await readFile(f.file('definitions'), 'utf8')).toBe(
        f.oldSources['definitions'],
      );
      expect(await readFile(duplicate, 'utf8')).toBe(bytes);
    },
  );

  it.each([false, true])(
    'does not create a metadata-only class for a companion deletion without a present owner (tombstoned=%s)',
    async (tombstoned) => {
      const f = await fixture();
      if (tombstoned) {
        await f.seed(false);
        await f.checkout(['main'], ['main']);
      }
      const result = await f.checkout(['implementations'], ['implementations']);
      const path = result.descriptors.find((path) =>
        path.endsWith('.clas.adt.json'),
      )!;
      const descriptor = JSON.parse(await readFile(join(f.root, path), 'utf8'));
      expect(descriptor.state).toBe('deleted');
      expect(descriptor.ownedFiles).toEqual([]);
      await expect(
        readFile(join(f.root, 'src/zcl_demo.clas.xml')),
      ).rejects.toMatchObject({ code: 'ENOENT' });
    },
  );

  it('refuses ambiguous duplicate legacy components before changing source', async () => {
    const f = await fixture();
    await f.seed(false);
    const duplicate = join(f.root, 'src/extra/zcl_demo.clas.locals_imp.abap');
    await mkdir(dirname(duplicate), { recursive: true });
    await writeFile(duplicate, '* different duplicate implementation\n');
    await expect(f.checkout()).rejects.toMatchObject({
      code: 'path_collision',
    });
    expect(await readFile(f.file('main'), 'utf8')).toBe(f.main(false));
    expect(await readFile(f.file('implementations'), 'utf8')).toBe(
      f.oldSources['implementations'],
    );
    expect(await readFile(duplicate, 'utf8')).toBe(
      '* different duplicate implementation\n',
    );
  });

  it('still removes the full owner for an exact whole-class deletion', async () => {
    const f = await fixture();
    await f.seed(false);
    const result = await f.checkout(['main'], ['main']);
    expect(result.removed).toHaveLength(6);
    for (const component of components)
      await expect(readFile(f.file(component))).rejects.toMatchObject({
        code: 'ENOENT',
      });
    expect(
      await readFile(join(f.root, 'src/unrelated.prog.abap'), 'utf8'),
    ).toBe('REPORT unrelated.\n');
  });

  it('preserves unselected sources when materialization has no class source anchor', async () => {
    const { preserveUnselectedClassComponents } =
      await import('../src/class-component-preservation');
    const f = await fixture();
    await f.seed(false);
    const result = await preserveUnselectedClassComponents({
      root: f.root,
      identity: {
        canonical: 'R3TR/CLAS/ZCL_DEMO',
        pgmid: 'R3TR',
        type: 'CLAS',
        name: 'ZCL_DEMO',
      },
      format: abapgitFormatPlugin,
      selectedComponents: new Set(['implementations']),
      existingPaths: [
        'src/zcl_demo.clas.abap',
        'src/zcl_demo.clas.locals_def.abap',
        'src/zcl_demo.clas.locals_imp.abap',
        'src/zcl_demo.clas.macros.abap',
        'src/zcl_demo.clas.testclasses.abap',
      ],
      files: [
        {
          path: 'src/zcl_demo.clas.xml',
          content: '<metadata/>',
          role: 'metadata',
        },
      ],
      previous: {
        schemaVersion: 1,
        formatVersion: 1,
        identity: {
          canonical: 'R3TR/CLAS/ZCL_DEMO',
          pgmid: 'R3TR',
          type: 'CLAS',
          name: 'ZCL_DEMO',
        },
        state: 'present',
        packagePath: ['ZROOT'],
        selections: [
          {
            component: 'main',
            versionId: '00002',
            sourceUri: '/fixture/main/00002',
          },
          {
            component: 'definitions',
            versionId: '00002',
            sourceUri: '/fixture/definitions/00002',
          },
          {
            component: 'macros',
            versionId: '00002',
            sourceUri: '/fixture/macros/00002',
          },
          {
            component: 'testclasses',
            versionId: '00002',
            sourceUri: '/fixture/testclasses/00002',
          },
        ],
        ownedFiles: [],
        configDigest: 'x',
        formatDigest: 'y',
      },
    });
    expect(result.files.map((file) => file.path).sort()).toEqual([
      'src/zcl_demo.clas.abap',
      'src/zcl_demo.clas.locals_def.abap',
      'src/zcl_demo.clas.macros.abap',
      'src/zcl_demo.clas.testclasses.abap',
      'src/zcl_demo.clas.xml',
    ]);
    expect(result.selections.map((s) => s.component).sort()).toEqual([
      'definitions',
      'macros',
      'main',
      'testclasses',
    ]);
  });

  it('moves preserved companions with the class instead of splitting its package layout', async () => {
    const f = await fixture();
    await f.seed(true);
    const result = await f.checkout(['main'], [], true);
    for (const component of components) {
      const original = f.file(component);
      await expect(readFile(original)).rejects.toMatchObject({
        code: 'ENOENT',
      });
      expect(
        await readFile(join(f.root, 'src/new', basename(original)), 'utf8'),
      ).toBe(component === 'main' ? f.main(true) : f.oldSources[component]);
    }
    expect(
      result.moved.filter((move) => move.from.includes('.clas.locals_')),
    ).toHaveLength(2);
  });
});
