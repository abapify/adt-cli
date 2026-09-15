import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SourceVersionRef } from '@abapify/adt-client';
import type { AdkContext } from '../src/base/context';

const resolveTransportObjectsMock = vi.hoisted(() => vi.fn());
const createAdkFactoryMock = vi.hoisted(() => vi.fn());
const functionModuleGetMock = vi.hoisted(() => vi.fn());

vi.mock('../src/objects/cts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/objects/cts')>()),
  resolveTransportObjects: resolveTransportObjectsMock,
}));

vi.mock('../src/factory', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/factory')>()),
  createAdkFactory: createAdkFactoryMock,
}));

vi.mock('../src/objects/repository/fugr', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/objects/repository/fugr')>()),
  AdkFunctionModule: { get: functionModuleGetMock },
}));

import {
  buildTransportSourceManifest,
  listObjectSourceVersions,
  ObjectSourceHistoryError,
  selectTransportSourceVersions,
} from '../src/transport-source-manifest';
import {
  buildTransportSourceManifest as publicBuildTransportSourceManifest,
  listObjectSourceVersions as publicListObjectSourceVersions,
  selectTransportSourceVersions as publicSelectTransportSourceVersions,
} from '../src/index';

const VERSIONS_RELATION = 'http://www.sap.com/adt/relations/versions';

function version(
  id: string,
  ordinal: number,
  transports: string[],
): SourceVersionRef {
  return {
    id,
    ordinal,
    sourceUri: `/sap/bc/adt/repository/source/versions/${id}/content`,
    transports,
  };
}

interface FakeTransportObjectOptions {
  name: string;
  type?: string;
  pgmid?: string;
  wbtype?: string;
  deleted?: boolean;
  objectUri?: string;
  factoryName?: string;
  metadata?: Record<string, unknown>;
  load?: () => Promise<void>;
}

const factoryObjects = new Map<string, unknown>();
const factoryGet = vi.fn();
const functionModuleObjects = new Map<string, unknown>();

function functionModuleObject(
  groupName: string,
  name: string,
  metadata: Record<string, unknown> = Object.fromEntries(
    Object.entries(rootSourceMetadata()).filter(
      ([key]) => key !== 'packageRef',
    ),
  ),
) {
  const model = {
    objectUri: `/sap/bc/adt/functions/groups/${groupName.toLowerCase()}/fmodules/${name.toLowerCase()}`,
    dataSync: metadata,
    load: vi.fn().mockResolvedValue(undefined),
  };
  functionModuleObjects.set(`${groupName}/${name}`, model);
  return model;
}

function transportObject({
  name,
  type = 'PROG',
  pgmid = 'R3TR',
  wbtype = type,
  deleted = false,
  objectUri = `/sap/bc/adt/programs/programs/${name.toLowerCase()}`,
  factoryName = name,
  metadata = {},
  load,
}: FakeTransportObjectOptions) {
  const key = `${pgmid}/${type}/${name}`;
  factoryObjects.set(factoryName, {
    objectUri,
    dataSync: metadata,
    load: load ?? vi.fn().mockResolvedValue(undefined),
  });
  return {
    key,
    pgmid,
    type,
    name,
    wbtype,
    uri: objectUri,
    objFunc: deleted ? 'D' : '',
    isDeleted: deleted,
  };
}

function rootSourceMetadata(packageName = 'ZPACKAGE'): Record<string, unknown> {
  return {
    packageRef: { name: packageName },
    sourceUri: 'source/main',
    link: {
      rel: VERSIONS_RELATION,
      href: 'source/main/versions',
    },
  };
}

function mockResolution(
  objects: ReturnType<typeof transportObject>[],
  sourceTransports: string[],
  scopeTransportNumbers = ['DEVK900001', 'DEVK900002'],
): void {
  resolveTransportObjectsMock.mockResolvedValue({
    objects,
    sourceTransportMap: new Map(
      objects.map((object, index) => [
        object.key,
        sourceTransports[index] ?? 'DEVK900002',
      ]),
    ),
    scopeTransportNumbers,
  });
}

function contextWithVersions(
  listVersions: (versionsUri: string) => Promise<SourceVersionRef[]>,
) {
  const readVersionSource = vi.fn();
  const quickSearch = vi.fn();
  const ctx = {
    client: {
      adt: { repository: { informationsystem: { search: { quickSearch } } } },
      services: {
        sourceHistory: { listVersions, readVersionSource },
      },
    },
  } as unknown as AdkContext;

  return { ctx, readVersionSource, quickSearch };
}

describe('selectTransportSourceVersions', () => {
  it('selects an in-scope modification and its immediate predecessor', () => {
    const head = version('00002', 0, ['DEVK900002']);
    const base = version('00001', 1, ['DEVK800001']);

    expect(
      selectTransportSourceVersions([base, head], ['DEVK900002'], false),
    ).toEqual({
      changeKind: 'modified',
      exact: true,
      base,
      head,
    });
  });

  it('marks the oldest source version as an exact addition', () => {
    const head = version('00001', 0, ['DEVK900002']);

    expect(
      selectTransportSourceVersions([head], ['DEVK900002'], false),
    ).toEqual({
      changeKind: 'added',
      exact: true,
      head,
    });
  });

  it('fails closed when an unrelated transport intervenes', () => {
    const newest = version('00004', 0, ['DEVK900002']);
    const intervening = version('00003', 1, ['DEVK800001']);
    const oldest = version('00002', 2, ['DEVK900002']);
    const base = version('00001', 3, ['DEVK700001']);

    expect(
      selectTransportSourceVersions(
        [oldest, base, newest, intervening],
        ['DEVK900002'],
        false,
      ),
    ).toEqual({
      changeKind: 'ambiguous',
      exact: false,
      base,
      head: newest,
      diagnostic: {
        code: 'SOURCE_HISTORY_INTERVENING_VERSION',
        message:
          'An unrelated source version occurs between in-scope versions.',
      },
    });
  });

  it('distinguishes missing provenance in the selected history range', () => {
    const newest = version('00003', 0, ['DEVK900002']);
    const missing = version('00002', 1, []);
    const oldest = version('00001', 2, ['DEVK900002']);

    expect(
      selectTransportSourceVersions(
        [newest, missing, oldest],
        ['DEVK900002'],
        false,
      ),
    ).toMatchObject({
      changeKind: 'ambiguous',
      exact: false,
      diagnostic: { code: 'SOURCE_HISTORY_PROVENANCE_MISSING' },
    });
  });

  it('fails a deletion closed when no source version carries requested-scope provenance', () => {
    const base = version('00002', 0, ['DEVK800001']);
    const older = version('00001', 1, ['DEVK700001']);

    expect(
      selectTransportSourceVersions([older, base], ['DEVK900002'], true),
    ).toEqual({
      changeKind: 'ambiguous',
      exact: false,
      diagnostic: {
        code: 'SOURCE_HISTORY_SCOPE_VERSION_MISSING',
        message:
          'No source version is attributed to the requested transport scope.',
      },
    });
  });

  it('uses the predecessor of an in-scope source change as the deletion base', () => {
    const inScope = version('00002', 0, ['DEVK900002']);
    const base = version('00001', 1, ['DEVK800001']);

    expect(
      selectTransportSourceVersions([base, inScope], ['DEVK900002'], true),
    ).toEqual({
      changeKind: 'deleted',
      exact: true,
      base,
    });
  });

  it('fails a deletion closed across an unrelated intervening source version', () => {
    const newest = version('00004', 0, ['DEVK900002']);
    const intervening = version('00003', 1, ['DEVK800001']);
    const oldest = version('00002', 2, ['DEVK900002']);
    const base = version('00001', 3, ['DEVK700001']);

    expect(
      selectTransportSourceVersions(
        [newest, intervening, oldest, base],
        ['DEVK900002'],
        true,
      ),
    ).toEqual({
      changeKind: 'ambiguous',
      exact: false,
      base,
      diagnostic: {
        code: 'SOURCE_HISTORY_INTERVENING_VERSION',
        message:
          'An unrelated source version occurs between in-scope versions.',
      },
    });
  });

  it('fails a deletion closed when selected history lacks provenance', () => {
    const newest = version('00004', 0, ['DEVK900002']);
    const missing = version('00003', 1, []);
    const oldest = version('00002', 2, ['DEVK900002']);
    const base = version('00001', 3, ['DEVK700001']);

    expect(
      selectTransportSourceVersions(
        [newest, missing, oldest, base],
        ['DEVK900002'],
        true,
      ),
    ).toMatchObject({
      changeKind: 'ambiguous',
      exact: false,
      base,
      diagnostic: { code: 'SOURCE_HISTORY_PROVENANCE_MISSING' },
    });
  });

  it('does not claim a deletion when no historical base is recoverable', () => {
    expect(
      selectTransportSourceVersions([], ['DEVK900002'], true),
    ).toMatchObject({
      changeKind: 'unsupported',
      exact: false,
      diagnostic: { code: 'DELETED_SOURCE_BASE_UNAVAILABLE' },
    });
  });

  it('fails closed when feed ordinals cannot establish a unique order', () => {
    const first = version('00002', 0, ['DEVK900002']);
    const duplicate = version('00001', 0, ['DEVK800001']);

    expect(
      selectTransportSourceVersions([first, duplicate], ['DEVK900002'], false),
    ).toMatchObject({
      changeKind: 'ambiguous',
      exact: false,
      diagnostic: { code: 'SOURCE_HISTORY_ORDER_INVALID' },
    });
  });
});

describe('public manifest API', () => {
  it('exports manifest construction and deterministic selection', () => {
    expect(publicBuildTransportSourceManifest).toBe(
      buildTransportSourceManifest,
    );
    expect(publicSelectTransportSourceVersions).toBe(
      selectTransportSourceVersions,
    );
    expect(publicListObjectSourceVersions).toBe(listObjectSourceVersions);
  });
});

describe('listObjectSourceVersions', () => {
  beforeEach(() => {
    createAdkFactoryMock.mockReset();
    factoryGet.mockReset();
    factoryObjects.clear();
    factoryGet.mockImplementation((name: string) => factoryObjects.get(name));
    createAdkFactoryMock.mockReturnValue({
      get: factoryGet,
    });
  });

  it('lists normalized metadata-only versions for a single-source object', async () => {
    transportObject({
      name: 'ZREPORT',
      metadata: rootSourceMetadata(),
    });
    const head = version('00002', 0, ['DEVK900002']);
    const base = version('00001', 1, ['DEVK800001']);
    const listVersions = vi.fn().mockResolvedValue([head, base]);
    const { ctx, readVersionSource } = contextWithVersions(listVersions);

    await expect(
      listObjectSourceVersions('zreport', 'prog', {}, ctx),
    ).resolves.toEqual({
      object: {
        name: 'ZREPORT',
        type: 'PROG',
        packageName: 'ZPACKAGE',
      },
      components: [
        {
          id: 'main',
          sourceUri: '/sap/bc/adt/programs/programs/zreport/source/main',
          versionsUri:
            '/sap/bc/adt/programs/programs/zreport/source/main/versions',
          versions: [head, base],
        },
      ],
    });

    expect(listVersions).toHaveBeenCalledWith(
      '/sap/bc/adt/programs/programs/zreport/source/main/versions',
    );
    expect(readVersionSource).not.toHaveBeenCalled();
  });

  it('lists every metadata-discovered component of a composite object', async () => {
    transportObject({
      name: 'ZCL_SAMPLE',
      type: 'CLAS',
      objectUri: '/sap/bc/adt/oo/classes/zcl_sample',
      metadata: {
        packageRef: { name: 'ZCOMPOSITE' },
        include: [
          {
            includeType: 'implementations',
            sourceUri: 'includes/implementations',
            link: {
              rel: VERSIONS_RELATION,
              href: 'includes/implementations/versions',
            },
          },
          {
            includeType: 'definitions',
            sourceUri: 'includes/definitions',
            link: {
              rel: VERSIONS_RELATION,
              href: 'includes/definitions/versions',
            },
          },
        ],
      },
    });
    const listVersions = vi.fn(async (uri: string) => [
      version(uri.includes('definitions') ? 'D1' : 'I1', 0, ['DEVK900002']),
    ]);
    const { ctx, readVersionSource } = contextWithVersions(listVersions);

    const result = await listObjectSourceVersions(
      'ZCL_SAMPLE',
      'CLAS',
      {},
      ctx,
    );

    expect(result.components.map((component) => component.id)).toEqual([
      'definitions',
      'implementations',
    ]);
    expect(
      result.components.map((component) => component.versions?.[0]?.id),
    ).toEqual(['D1', 'I1']);
    expect(listVersions).toHaveBeenCalledTimes(2);
    expect(readVersionSource).not.toHaveBeenCalled();
  });

  it('filters a composite object by case-insensitive exact component id', async () => {
    transportObject({
      name: 'ZCL_FILTER',
      type: 'CLAS',
      objectUri: '/sap/bc/adt/oo/classes/zcl_filter',
      metadata: {
        include: [
          {
            includeType: 'definitions',
            sourceUri: 'includes/definitions',
            link: {
              rel: VERSIONS_RELATION,
              href: 'includes/definitions/versions',
            },
          },
          {
            includeType: 'implementations',
            sourceUri: 'includes/implementations',
            link: {
              rel: VERSIONS_RELATION,
              href: 'includes/implementations/versions',
            },
          },
        ],
      },
    });
    const listVersions = vi
      .fn()
      .mockResolvedValue([version('D1', 0, ['DEVK900002'])]);
    const { ctx } = contextWithVersions(listVersions);

    const result = await listObjectSourceVersions(
      'ZCL_FILTER',
      'CLAS',
      { component: 'DeFiNiTiOnS' },
      ctx,
    );

    expect(result.components.map((component) => component.id)).toEqual([
      'definitions',
    ]);
    expect(listVersions).toHaveBeenCalledOnce();
    expect(listVersions).toHaveBeenCalledWith(
      '/sap/bc/adt/oo/classes/zcl_filter/includes/definitions/versions',
    );
  });

  it('rejects an unknown exact component filter with a stable public error', async () => {
    transportObject({
      name: 'ZCL_FILTER_MISS',
      type: 'CLAS',
      objectUri: '/sap/bc/adt/oo/classes/zcl_filter_miss',
      metadata: {
        include: {
          includeType: 'definitions',
          sourceUri: 'includes/definitions',
          link: {
            rel: VERSIONS_RELATION,
            href: 'includes/definitions/versions',
          },
        },
      },
    });
    const listVersions = vi.fn();
    const { ctx } = contextWithVersions(listVersions);

    const operation = listObjectSourceVersions(
      'ZCL_FILTER_MISS',
      'CLAS',
      { component: 'definition' },
      ctx,
    );

    await expect(operation).rejects.toBeInstanceOf(ObjectSourceHistoryError);
    await expect(operation).rejects.toMatchObject({
      code: 'SOURCE_COMPONENT_NOT_FOUND',
      object: { name: 'ZCL_FILTER_MISS', type: 'CLAS' },
    });
    expect(listVersions).not.toHaveBeenCalled();
  });

  it('keeps the root component id "main" for a FUGR/FF function module', async () => {
    transportObject({
      name: 'ZFM_KEEP_MAIN',
      type: 'FUGR/FF',
      objectUri:
        '/sap/bc/adt/functions/groups/zfg_keep_main/fmodules/zfm_keep_main',
      metadata: rootSourceMetadata(),
    });
    const head = version('00001', 0, ['DEVK900002']);
    const listVersions = vi.fn().mockResolvedValue([head]);
    const { ctx } = contextWithVersions(listVersions);

    const result = await listObjectSourceVersions(
      'ZFM_KEEP_MAIN',
      'FUGR/FF',
      { component: 'main' },
      ctx,
    );

    expect(result.components.map((component) => component.id)).toEqual([
      'main',
    ]);
    expect(result.components[0]?.versions).toEqual([head]);
  });

  it('returns a stable diagnostic for a component without version history', async () => {
    transportObject({
      name: 'ZNO_HISTORY',
      metadata: {
        packageRef: { name: 'ZPACKAGE' },
        sourceUri: 'source/main',
      },
    });
    const listVersions = vi.fn();
    const { ctx, readVersionSource } = contextWithVersions(listVersions);

    const result = await listObjectSourceVersions(
      'ZNO_HISTORY',
      'PROG',
      {},
      ctx,
    );

    expect(result.components).toEqual([
      {
        id: 'main',
        sourceUri: '/sap/bc/adt/programs/programs/zno_history/source/main',
        diagnostic: {
          code: 'SOURCE_COMPONENT_VERSIONS_UNAVAILABLE',
          message: 'The source component has no exact versions relation.',
        },
      },
    ]);
    expect(listVersions).not.toHaveBeenCalled();
    expect(readVersionSource).not.toHaveBeenCalled();
  });

  it('sanitizes a component version-feed retrieval failure', async () => {
    transportObject({
      name: 'ZFAILED_HISTORY',
      metadata: rootSourceMetadata(),
    });
    const listVersions = vi
      .fn()
      .mockRejectedValue(new Error('sensitive raw adapter response'));
    const { ctx, readVersionSource } = contextWithVersions(listVersions);

    const result = await listObjectSourceVersions(
      'ZFAILED_HISTORY',
      'PROG',
      {},
      ctx,
    );

    expect(result.components).toEqual([
      {
        id: 'main',
        sourceUri: '/sap/bc/adt/programs/programs/zfailed_history/source/main',
        versionsUri:
          '/sap/bc/adt/programs/programs/zfailed_history/source/main/versions',
        diagnostic: {
          code: 'SOURCE_HISTORY_RETRIEVAL_FAILED',
          message: 'SAP ADT rejected source-history metadata retrieval.',
        },
      },
    ]);
    expect(JSON.stringify(result)).not.toContain('sensitive');
    expect(readVersionSource).not.toHaveBeenCalled();
  });
});

describe('buildTransportSourceManifest', () => {
  beforeEach(() => {
    resolveTransportObjectsMock.mockReset();
    createAdkFactoryMock.mockReset();
    factoryGet.mockReset();
    factoryObjects.clear();
    factoryGet.mockImplementation((name: string) => factoryObjects.get(name));
    createAdkFactoryMock.mockReturnValue({
      get: factoryGet,
    });
    functionModuleObjects.clear();
    functionModuleGetMock.mockReset();
    functionModuleGetMock.mockImplementation(
      async (groupName: string, name: string) =>
        functionModuleObjects.get(`${groupName}/${name}`),
    );
  });

  it('builds an exact metadata-only manifest with concrete task provenance', async () => {
    const object = transportObject({
      name: 'ZREPORT',
      metadata: rootSourceMetadata(),
    });
    mockResolution([object], ['DEVK900002']);

    const head = version('00002', 0, ['DEVK900002']);
    const base = version('00001', 1, ['DEVK800001']);
    const listVersions = vi.fn().mockResolvedValue([head, base]);
    const { ctx, readVersionSource } = contextWithVersions(listVersions);

    await expect(
      buildTransportSourceManifest(['DEVK900001'], {}, ctx),
    ).resolves.toEqual({
      requestedTransports: ['DEVK900001'],
      scopeTransports: ['DEVK900001', 'DEVK900002'],
      inventory: [
        {
          pgmid: 'R3TR',
          type: 'PROG',
          name: 'ZREPORT',
          wbtype: 'PROG',
          uri: '/sap/bc/adt/programs/programs/zreport',
          objFunc: '',
          sourceTransport: 'DEVK900002',
        },
      ],
      entries: [
        {
          object: {
            pgmid: 'R3TR',
            type: 'PROG',
            name: 'ZREPORT',
            packageName: 'ZPACKAGE',
          },
          component: {
            id: 'main',
            sourceUri: '/sap/bc/adt/programs/programs/zreport/source/main',
            versionsUri:
              '/sap/bc/adt/programs/programs/zreport/source/main/versions',
          },
          sourceTransport: 'DEVK900002',
          changeKind: 'modified',
          exact: true,
          base,
          head,
        },
      ],
    });

    expect(listVersions).toHaveBeenCalledWith(
      '/sap/bc/adt/programs/programs/zreport/source/main/versions',
    );
    expect(readVersionSource).not.toHaveBeenCalled();
  });

  it('matches parent-attributed source history for a directly requested task', async () => {
    const object = transportObject({
      name: 'ZTASK_CREATED_CLASS',
      type: 'CLAS',
      objectUri: '/sap/bc/adt/oo/classes/ztask_created_class',
      metadata: rootSourceMetadata(),
    });
    mockResolution([object], ['DEVK901021'], ['DEVK901021', 'DEVK901020']);
    const head = version('00001', 0, ['DEVK901020']);
    const { ctx } = contextWithVersions(vi.fn().mockResolvedValue([head]));

    const result = await buildTransportSourceManifest(['DEVK901021'], {}, ctx);

    expect(result.scopeTransports).toEqual(['DEVK901021', 'DEVK901020']);
    expect(result.entries[0]).toMatchObject({
      sourceTransport: 'DEVK901021',
      changeKind: 'added',
      exact: true,
      head,
    });
    expect(result.entries[0]?.base).toBeUndefined();
  });

  it('resolves a LIMU REPS transport leaf through the PROG source-history model', async () => {
    const object = transportObject({
      name: 'ZTEST_GCTS_PROGRAM',
      type: 'REPS',
      pgmid: 'LIMU',
      metadata: rootSourceMetadata(),
    });
    mockResolution([object], ['TRLK900236'], ['TRLK900103', 'TRLK900236']);
    const head = version('00002', 0, ['TRLK900236']);
    const base = version('00001', 1, ['TRLK900100']);
    const { ctx } = contextWithVersions(
      vi.fn().mockResolvedValue([head, base]),
    );

    const manifest = await buildTransportSourceManifest(
      ['TRLK900103'],
      {},
      ctx,
    );

    expect(factoryGet).toHaveBeenCalledWith('ZTEST_GCTS_PROGRAM', 'PROG');
    expect(manifest.entries).toEqual([
      expect.objectContaining({
        object: {
          pgmid: 'LIMU',
          type: 'REPS',
          name: 'ZTEST_GCTS_PROGRAM',
          packageName: 'ZPACKAGE',
        },
        sourceTransport: 'TRLK900236',
        changeKind: 'modified',
        exact: true,
        base,
        head,
      }),
    ]);
  });

  it('retains every CTS object and resolves supported LIMU leaves through their repository owner', async () => {
    const method = transportObject({
      name: 'ZCL_REVIEWED                  APPLY_CHANGE',
      type: 'METH',
      pgmid: 'LIMU',
      wbtype: 'CLAS',
      objectUri: '/sap/bc/adt/oo/classes/zcl_reviewed/source/main',
      factoryName: 'ZCL_REVIEWED',
      metadata: rootSourceMetadata(),
    });
    const unsupported = transportObject({
      name: 'ZUNSUPPORTED',
      type: 'ZZZZ',
      pgmid: 'LIMU',
      wbtype: 'ZZZZ',
      objectUri:
        '/sap/bc/adt/repository/informationsystem/objectproperties/values',
    });
    mockResolution(
      [method, unsupported],
      ['DEVK900002', 'DEVK900002'],
      ['DEVK900001', 'DEVK900002'],
    );
    const head = version('00002', 0, ['DEVK900002']);
    const base = version('00001', 1, ['DEVK800001']);
    const { ctx } = contextWithVersions(
      vi.fn().mockResolvedValue([head, base]),
    );

    const manifest = await buildTransportSourceManifest(
      ['DEVK900002'],
      { selector: { type: ['CLAS'] } },
      ctx,
    );

    expect(resolveTransportObjectsMock).toHaveBeenCalledWith(
      ['DEVK900002'],
      {},
      ctx,
    );
    expect(manifest.inventory).toEqual([
      {
        pgmid: 'LIMU',
        type: 'METH',
        name: 'ZCL_REVIEWED                  APPLY_CHANGE',
        wbtype: 'CLAS',
        uri: '/sap/bc/adt/oo/classes/zcl_reviewed/source/main',
        objFunc: '',
        sourceTransport: 'DEVK900002',
      },
      {
        pgmid: 'LIMU',
        type: 'ZZZZ',
        name: 'ZUNSUPPORTED',
        wbtype: 'ZZZZ',
        uri: '/sap/bc/adt/repository/informationsystem/objectproperties/values',
        objFunc: '',
        sourceTransport: 'DEVK900002',
      },
    ]);
    expect(factoryGet).toHaveBeenCalledWith('ZCL_REVIEWED', 'CLAS');
    expect(manifest.entries).toEqual([
      expect.objectContaining({
        object: {
          pgmid: 'LIMU',
          type: 'METH',
          name: 'ZCL_REVIEWED                  APPLY_CHANGE',
          packageName: 'ZPACKAGE',
        },
        repositoryObject: {
          pgmid: 'R3TR',
          type: 'CLAS',
          name: 'ZCL_REVIEWED',
          packageName: 'ZPACKAGE',
        },
        sourceTransport: 'DEVK900002',
        changeKind: 'modified',
        exact: true,
      }),
    ]);
  });

  it('canonicalizes function and namespaced class leaves without losing their CTS identities', async () => {
    const functionModule = transportObject({
      name: '/ESOURC/SVIM_IVALUA_SEND_DP',
      type: 'FUNC',
      pgmid: 'LIMU',
      wbtype: 'FUGR',
      objectUri:
        '/sap/bc/adt/functions/groups/%2FESOURC%2FSVIM_IVALUA/source/main',
      factoryName: '/ESOURC/SVIM_IVALUA',
      metadata: rootSourceMetadata(),
    });
    const classDefinition = transportObject({
      name: '/ESOURC/CL_SVIM_IVALUA',
      type: 'CLSD',
      pgmid: 'LIMU',
      wbtype: 'CLAS',
      objectUri:
        '/sap/bc/adt/oo/classes/%2FESOURC%2FCL_SVIM_IVALUA/source/main',
      factoryName: '/ESOURC/CL_SVIM_IVALUA',
      metadata: rootSourceMetadata(),
    });
    const classPublicSection = transportObject({
      name: '/ESOURC/CL_SVIM_IVALUA',
      type: 'CPUB',
      pgmid: 'LIMU',
      wbtype: 'CLAS',
      objectUri:
        '/sap/bc/adt/oo/classes/%2FESOURC%2FCL_SVIM_IVALUA/source/main',
      factoryName: '/ESOURC/CL_SVIM_IVALUA',
      metadata: rootSourceMetadata(),
    });
    mockResolution(
      [functionModule, classDefinition, classPublicSection],
      ['DEVK900003', 'DEVK900003', 'DEVK900003'],
      ['DEVK900003'],
    );
    const { ctx } = contextWithVersions(
      vi
        .fn()
        .mockResolvedValue([
          version('00002', 0, ['DEVK900003']),
          version('00001', 1, ['DEVK800001']),
        ]),
    );

    const manifest = await buildTransportSourceManifest(
      ['DEVK900003'],
      {},
      ctx,
    );

    expect(manifest.inventory).toHaveLength(3);
    expect(manifest.inventory.map(({ type }) => type).sort()).toEqual([
      'CLSD',
      'CPUB',
      'FUNC',
    ]);
    expect(factoryGet).toHaveBeenCalledWith('/ESOURC/SVIM_IVALUA', 'FUGR');
    expect(factoryGet).toHaveBeenCalledWith('/ESOURC/CL_SVIM_IVALUA', 'CLAS');
    expect(manifest.entries).toHaveLength(2);
    expect(manifest.entries.map((entry) => entry.repositoryObject)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'FUGR',
          name: '/ESOURC/SVIM_IVALUA',
        }),
        expect.objectContaining({
          type: 'CLAS',
          name: '/ESOURC/CL_SVIM_IVALUA',
        }),
      ]),
    );
  });

  it('canonicalizes an R3TR function module to its owning function group', async () => {
    const functionModule = transportObject({
      name: 'ZFM_PY_LEAN_PAYMEDIUM_EVENT_21',
      type: 'FUNC',
      objectUri:
        '/sap/bc/adt/functions/groups/zfg_py_lean/fmodules/zfm_py_lean_paymedium_event_21',
      factoryName: 'ZFG_PY_LEAN',
      metadata: rootSourceMetadata(),
    });
    mockResolution([functionModule], ['DEVK900003'], ['DEVK900003']);
    const { ctx } = contextWithVersions(
      vi
        .fn()
        .mockResolvedValue([
          version('00002', 0, ['DEVK900003']),
          version('00001', 1, ['DEVK800001']),
        ]),
    );

    const manifest = await buildTransportSourceManifest(
      ['DEVK900003'],
      {},
      ctx,
    );

    expect(factoryGet).toHaveBeenCalledWith('ZFG_PY_LEAN', 'FUGR');
    expect(manifest.entries).toEqual([
      expect.objectContaining({
        object: {
          pgmid: 'R3TR',
          type: 'FUNC',
          name: 'ZFM_PY_LEAN_PAYMEDIUM_EVENT_21',
          packageName: 'ZPACKAGE',
        },
        repositoryObject: {
          pgmid: 'R3TR',
          type: 'FUGR',
          name: 'ZFG_PY_LEAN',
          packageName: 'ZPACKAGE',
        },
        exact: true,
      }),
    ]);
  });

  it('resolves real LIMU FUNC FUGR/FF inventory through its searched group URI', async () => {
    const functionModule = transportObject({
      name: 'ZFM_PY_LEAN_PAYMEDIUM_EVENT_21',
      pgmid: 'LIMU',
      type: 'FUNC',
      wbtype: 'FUGR/FF',
      objectUri: '',
      factoryName: 'ZFG_PY_LEAN',
      metadata: rootSourceMetadata(),
    });
    functionModuleObject('ZFG_PY_LEAN', 'ZFM_PY_LEAN_PAYMEDIUM_EVENT_21');
    mockResolution([functionModule], ['S0DK955760'], ['S0DK955760']);
    const { ctx, quickSearch } = contextWithVersions(
      vi.fn().mockResolvedValue([version('00001', 0, ['S0DK955760'])]),
    );
    // A same-named non-FUGR result (e.g. a program) appears before the
    // valid function-module result. The resolver must skip the non-FUGR
    // URI and select the function-module URI whose path resolves to the
    // owning function group.
    quickSearch.mockResolvedValue({
      objectReferences: {
        objectReference: [
          {
            name: 'ZFM_PY_LEAN_PAYMEDIUM_EVENT_21',
            uri: '/sap/bc/adt/programs/zfm_py_lean_paymedium_event_21',
          },
          {
            name: 'ZFM_PY_LEAN_PAYMEDIUM_EVENT_21',
            uri: '/sap/bc/adt/functions/groups/zfg_py_lean/fmodules/zfm_py_lean_paymedium_event_21',
          },
        ],
      },
    });
    const manifest = await buildTransportSourceManifest(
      ['S0DK955760'],
      {},
      ctx,
    );
    expect(quickSearch).toHaveBeenCalledWith({
      query: 'ZFM_PY_LEAN_PAYMEDIUM_EVENT_21',
      maxResults: 10,
    });
    expect(functionModuleGetMock).toHaveBeenCalledWith(
      'ZFG_PY_LEAN',
      'ZFM_PY_LEAN_PAYMEDIUM_EVENT_21',
      ctx,
    );
    expect(factoryGet).toHaveBeenCalledWith('ZFG_PY_LEAN', 'FUGR');
    expect(manifest.entries).toEqual([
      expect.objectContaining({
        object: expect.objectContaining({
          pgmid: 'LIMU',
          type: 'FUNC',
          name: 'ZFM_PY_LEAN_PAYMEDIUM_EVENT_21',
          packageName: 'ZPACKAGE',
        }),
        repositoryObject: expect.objectContaining({
          pgmid: 'R3TR',
          type: 'FUGR',
          name: 'ZFG_PY_LEAN',
          packageName: 'ZPACKAGE',
        }),
      }),
    ]);
  });

  it('keeps separate source components for two function modules in one group', async () => {
    const functionNames = [
      'ZFM_PY_LEAN_PAYMEDIUM_EVENT_21',
      'ZFM_PY_LEAN_PAYMEDIUM_EVENT_41',
    ];
    const functionModules = functionNames.map((name) => {
      const functionModule = transportObject({
        name,
        pgmid: 'LIMU',
        type: 'FUNC',
        wbtype: 'FUGR/FF',
        objectUri: '',
        factoryName: 'ZFG_PY_LEAN',
        metadata: rootSourceMetadata(),
      });
      functionModuleObject('ZFG_PY_LEAN', name);
      return functionModule;
    });
    mockResolution(
      functionModules,
      ['S0DK955760', 'S0DK955760'],
      ['S0DK955760'],
    );
    const { ctx, quickSearch } = contextWithVersions(
      vi.fn().mockResolvedValue([version('00001', 0, ['S0DK955760'])]),
    );
    quickSearch.mockImplementation(async ({ query }: { query: string }) => ({
      objectReferences: {
        objectReference: [
          {
            name: query,
            uri: `/sap/bc/adt/functions/groups/zfg_py_lean/fmodules/${query.toLowerCase()}`,
          },
        ],
      },
    }));

    const manifest = await buildTransportSourceManifest(
      ['S0DK955760'],
      {},
      ctx,
    );

    expect(manifest.entries).toHaveLength(2);
    expect(manifest.entries.map((entry) => entry.component.id)).toEqual(
      functionNames.map((name) => name.toLowerCase()),
    );
    expect(manifest.entries.map((entry) => entry.component.sourceUri)).toEqual(
      functionNames.map(
        (name) =>
          `/sap/bc/adt/functions/groups/zfg_py_lean/fmodules/${name.toLowerCase()}/source/main`,
      ),
    );
  });

  it('ignores R3TR SUSK authorization-maintenance assignments as non-source entries', async () => {
    const authorizationAssignment = transportObject({
      name: 'Z_CONCUR_RECON',
      type: 'SUSK',
    });
    const program = transportObject({
      name: 'ZREVIEWED_PROGRAM',
      metadata: rootSourceMetadata(),
    });
    mockResolution(
      [authorizationAssignment, program],
      ['DEVK900002', 'DEVK900002'],
    );
    const head = version('00001', 0, ['DEVK900002']);
    const { ctx } = contextWithVersions(vi.fn().mockResolvedValue([head]));

    const manifest = await buildTransportSourceManifest(
      ['DEVK900001'],
      {},
      ctx,
    );

    expect(manifest.entries).toEqual([
      expect.objectContaining({
        object: expect.objectContaining({
          pgmid: 'R3TR',
          type: 'PROG',
          name: 'ZREVIEWED_PROGRAM',
        }),
        exact: true,
        head,
      }),
    ]);
    expect(factoryGet).not.toHaveBeenCalledWith('Z_CONCUR_RECON', 'SUSK');
  });

  it('discovers and selects composite components independently', async () => {
    const object = transportObject({
      name: 'ZCL_SAMPLE',
      type: 'CLAS',
      objectUri: '/sap/bc/adt/oo/classes/zcl_sample',
      metadata: {
        packageRef: { name: 'ZCOMPOSITE' },
        include: [
          {
            includeType: 'implementations',
            sourceUri: 'includes/implementations',
            links: [
              {
                rel: VERSIONS_RELATION,
                href: 'includes/implementations/versions',
              },
            ],
          },
          {
            includeType: 'definitions',
            sourceUri: 'includes/definitions',
            link: {
              rel: VERSIONS_RELATION,
              href: 'includes/definitions/versions',
            },
          },
        ],
      },
    });
    mockResolution([object], ['DEVK900002']);

    const listVersions = vi.fn(async (uri: string) => [
      version(uri.includes('definitions') ? 'D2' : 'I2', 0, ['DEVK900002']),
      version(uri.includes('definitions') ? 'D1' : 'I1', 1, ['DEVK800001']),
    ]);
    const { ctx } = contextWithVersions(listVersions);

    const manifest = await buildTransportSourceManifest(
      ['DEVK900001'],
      {},
      ctx,
    );

    expect(manifest.entries.map((entry) => entry.component.id)).toEqual([
      'definitions',
      'implementations',
    ]);
    expect(manifest.entries).toHaveLength(2);
    expect(manifest.entries.every((entry) => entry.exact)).toBe(true);
    expect(listVersions).toHaveBeenCalledTimes(2);
  });

  it('represents an object created in scope as added', async () => {
    const object = transportObject({
      name: 'ZNEW_REPORT',
      metadata: rootSourceMetadata(),
    });
    mockResolution([object], ['DEVK900002']);
    const head = version('00001', 0, ['DEVK900002']);
    const { ctx } = contextWithVersions(vi.fn().mockResolvedValue([head]));

    const manifest = await buildTransportSourceManifest(
      ['DEVK900001'],
      {},
      ctx,
    );

    expect(manifest.entries[0]).toMatchObject({
      changeKind: 'added',
      exact: true,
      head,
    });
    expect(manifest.entries[0]?.base).toBeUndefined();
  });

  it('keeps a deletion ambiguous when no source version proves the requested scope', async () => {
    const object = transportObject({
      name: 'ZDELETED_REPORT',
      deleted: true,
      metadata: rootSourceMetadata(),
    });
    mockResolution([object], ['DEVK900002']);
    const base = version('00002', 0, ['DEVK800001']);
    const { ctx } = contextWithVersions(vi.fn().mockResolvedValue([base]));

    const manifest = await buildTransportSourceManifest(
      ['DEVK900001'],
      {},
      ctx,
    );

    expect(manifest.entries[0]).toMatchObject({
      changeKind: 'ambiguous',
      exact: false,
      diagnostic: { code: 'SOURCE_HISTORY_SCOPE_VERSION_MISSING' },
    });
    expect(manifest.entries[0]?.base).toBeUndefined();
    expect(manifest.entries[0]?.head).toBeUndefined();
  });

  it('marks a source component without a versions relation unsupported', async () => {
    const object = transportObject({
      name: 'ZNO_HISTORY',
      metadata: {
        packageRef: { name: 'ZPACKAGE' },
        sourceUri: 'source/main',
      },
    });
    mockResolution([object], ['DEVK900002']);
    const listVersions = vi.fn();
    const { ctx } = contextWithVersions(listVersions);

    const manifest = await buildTransportSourceManifest(
      ['DEVK900001'],
      {},
      ctx,
    );

    expect(manifest.entries[0]).toMatchObject({
      changeKind: 'unsupported',
      exact: false,
      component: { id: 'main' },
      diagnostic: { code: 'SOURCE_COMPONENT_VERSIONS_UNAVAILABLE' },
    });
    expect(listVersions).not.toHaveBeenCalled();
  });

  it('marks a rejected version-feed request failed without exposing its error', async () => {
    const object = transportObject({
      name: 'ZFAILED_HISTORY',
      metadata: rootSourceMetadata(),
    });
    mockResolution([object], ['DEVK900002']);
    const { ctx } = contextWithVersions(
      vi.fn().mockRejectedValue(new Error('sensitive adapter response')),
    );

    const manifest = await buildTransportSourceManifest(
      ['DEVK900001'],
      {},
      ctx,
    );

    expect(manifest.entries[0]).toMatchObject({
      changeKind: 'failed',
      exact: false,
      diagnostic: { code: 'SOURCE_HISTORY_RETRIEVAL_FAILED' },
    });
    expect(manifest.entries[0]?.diagnostic?.message).not.toContain('sensitive');
  });

  it('marks a concrete ADK metadata load rejection unsupported', async () => {
    const object = transportObject({
      name: 'ZLOAD_FAILURE',
      metadata: rootSourceMetadata(),
      load: vi.fn().mockRejectedValue(new Error('sensitive SAP response')),
    });
    mockResolution([object], ['DEVK900002']);
    const { ctx } = contextWithVersions(vi.fn());

    const manifest = await buildTransportSourceManifest(
      ['DEVK900001'],
      {},
      ctx,
    );

    expect(manifest.entries[0]).toMatchObject({
      changeKind: 'unsupported',
      exact: false,
      diagnostic: { code: 'OBJECT_METADATA_LOAD_FAILED' },
    });
    expect(manifest.entries[0]?.diagnostic?.message).not.toContain('sensitive');
  });

  it('marks an ADK generic object without a loader unsupported', async () => {
    const object = transportObject({
      name: 'ZUNSUPPORTED',
      type: 'ZZZZ',
    });
    factoryObjects.set(object.name, {
      objectUri: '/sap/bc/adt/unknown/object',
    });
    mockResolution([object], ['DEVK900002']);
    const { ctx } = contextWithVersions(vi.fn());

    const manifest = await buildTransportSourceManifest(
      ['DEVK900001'],
      {},
      ctx,
    );

    expect(manifest.entries[0]).toMatchObject({
      changeKind: 'unsupported',
      exact: false,
      diagnostic: { code: 'OBJECT_TYPE_UNSUPPORTED' },
    });
  });

  it('returns deterministic ordering and bounds metadata/feed concurrency', async () => {
    let active = 0;
    let maximumActive = 0;
    const withActivity = async <T>(value: T): Promise<T> => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 3));
      active -= 1;
      return value;
    };

    const objects = ['ZREPORT_C', 'ZREPORT_A', 'ZREPORT_B'].map((name) =>
      transportObject({
        name,
        load: () => withActivity(undefined),
        objectUri: `/sap/bc/adt/programs/programs/${name.toLowerCase()}`,
        metadata: rootSourceMetadata(),
      }),
    );
    mockResolution(objects, ['DEVK900002', 'DEVK900002', 'DEVK900002']);
    const { ctx } = contextWithVersions(() =>
      withActivity([version('00001', 0, ['DEVK900002'])]),
    );

    const manifest = await buildTransportSourceManifest(
      ['DEVK900001'],
      { concurrency: 2 },
      ctx,
    );

    expect(manifest.entries.map((entry) => entry.object.name)).toEqual([
      'ZREPORT_A',
      'ZREPORT_B',
      'ZREPORT_C',
    ]);
    expect(maximumActive).toBe(2);
  });
});
