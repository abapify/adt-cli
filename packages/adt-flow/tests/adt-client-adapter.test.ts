import { describe, expect, it, vi } from 'vitest';
import type { AdkFactory, TransportSourceManifest } from '@abapify/adk';
import type { AdtClient, SourceVersionRef } from '@abapify/adt-client';
import type { FormatPlugin } from '@abapify/adt-plugin';
import {
  createAdtFlowDependencies,
  type AdtFlowAdapterOperations,
} from '../src/adt-client-adapter';

const format = {
  id: 'abapgit',
  description: 'test',
  supportedTypes: ['CLAS'],
  getHandler: vi.fn(),
} satisfies FormatPlugin;

const manifest: TransportSourceManifest = {
  requestedTransports: ['DEVK900001'],
  scopeTransports: ['DEVK900001'],
  inventory: [],
  entries: [],
};

function client(read = vi.fn(async () => 'source')): AdtClient {
  return {
    services: {
      sourceHistory: { readVersionSourceBounded: read },
    },
  } as unknown as AdtClient;
}

describe('ADT client adapter', () => {
  it('delegates the selector and performs bounded immutable source reads', async () => {
    const read = vi.fn(async () => 'source');
    const buildManifest = vi.fn(async () => manifest);
    const operations: AdtFlowAdapterOperations = {
      buildManifest,
      createFactory: vi.fn(() => ({ get: vi.fn() }) as unknown as AdkFactory),
    };
    const adtClient = client(read);
    const dependencies = createAdtFlowDependencies(
      adtClient,
      format,
      operations,
    );

    await expect(
      dependencies.buildManifest(['DEVK900001'], {
        objectTypes: ['CLAS'],
        concurrency: 3,
      }),
    ).resolves.toBe(manifest);
    const selected = {
      id: 'v1',
      sourceUri: '/sap/bc/adt/source/v1',
      transports: ['DEVK900001'],
    } as SourceVersionRef;
    await expect(dependencies.readSource(selected, 1024)).resolves.toBe(
      'source',
    );

    expect(buildManifest).toHaveBeenCalledWith(
      ['DEVK900001'],
      {
        selector: { pgmid: ['R3TR', 'LIMU'], type: ['CLAS'] },
        concurrency: 3,
      },
      { client: adtClient },
    );
    expect(read).toHaveBeenCalledWith('/sap/bc/adt/source/v1', 1024);
  });

  it('defaults the manifest selector to repository pgmids R3TR and LIMU', async () => {
    const buildManifest = vi.fn(async () => manifest);
    const adtClient = client();
    const dependencies = createAdtFlowDependencies(adtClient, format, {
      buildManifest,
      createFactory: vi.fn(() => ({ get: vi.fn() }) as unknown as AdkFactory),
    });

    await expect(
      dependencies.buildManifest(['DEVK900001'], { concurrency: 3 }),
    ).resolves.toBe(manifest);

    expect(buildManifest).toHaveBeenCalledWith(
      ['DEVK900001'],
      {
        selector: { pgmid: ['R3TR', 'LIMU'] },
        concurrency: 3,
      },
      { client: adtClient },
    );
  });

  it('loads the object and resolves its package path and application component', async () => {
    const object = { load: vi.fn(), package: 'ZFEATURE' };
    const feature = {
      load: vi.fn(),
      superPackage: { name: 'ZROOT' },
      applicationComponent: { name: 'BC-TEST' },
    };
    const root = { load: vi.fn() };
    const get = vi.fn((name: string, type: string) => {
      if (type === 'CLAS') return object;
      return name === 'ZFEATURE' ? feature : root;
    });
    const dependencies = createAdtFlowDependencies(client(), format, {
      buildManifest: vi.fn(async () => manifest),
      createFactory: vi.fn(() => ({ get }) as unknown as AdkFactory),
    });

    await expect(
      dependencies.loadObject({
        canonical: 'R3TR/CLAS/ZCL_SAMPLE',
        pgmid: 'R3TR',
        type: 'CLAS',
        name: 'ZCL_SAMPLE',
      }),
    ).resolves.toEqual({
      object,
      packagePath: ['ZROOT', 'ZFEATURE'],
      applicationComponent: 'BC-TEST',
      metadataCalls: 3,
    });
    expect(get.mock.calls).toEqual([
      ['ZCL_SAMPLE', 'CLAS'],
      ['ZFEATURE', 'DEVC/K'],
      ['ZROOT', 'DEVC/K'],
    ]);
  });

  it('sanitizes adapter failures', async () => {
    const dependencies = createAdtFlowDependencies(client(), format, {
      buildManifest: vi.fn(async () => {
        throw new Error('secret response body');
      }),
      createFactory: vi.fn(() => ({ get: vi.fn() }) as unknown as AdkFactory),
    });

    await expect(
      dependencies.buildManifest(['DEVK900001'], { concurrency: 1 }),
    ).rejects.toMatchObject({
      code: 'sap_operation_failed',
      message: 'SAP ADT transport source-manifest construction failed.',
    });
  });
});
