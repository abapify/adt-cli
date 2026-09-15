import { describe, expect, it, vi } from 'vitest';
import type { AdtClient } from '@abapify/adt-client';
import {
  ExactSourceHistoryService,
  ExactSourceHistoryServiceError,
  toMetadataOnlyTransportSourceManifest,
  type BuildTransportManifestResult,
  type ExactSourceHistoryOperations,
  type ListObjectVersionsResult,
} from './service';

function createClient(source = 'REPORT ztest.'): AdtClient {
  return {
    services: {
      sourceHistory: {
        readVersionSource: vi.fn(async () => source),
      },
    },
  } as unknown as AdtClient;
}

function createOperations(results?: {
  listing?: ListObjectVersionsResult;
  manifest?: BuildTransportManifestResult;
}): ExactSourceHistoryOperations {
  return {
    listObjectSourceVersions: vi.fn(async () =>
      Promise.resolve(
        results?.listing ?? {
          object: { name: 'ZCL_TEST', type: 'CLAS' },
          components: [],
        },
      ),
    ),
    buildTransportSourceManifest: vi.fn(async () =>
      Promise.resolve(
        results?.manifest ?? {
          requestedTransports: ['DEVK900001'],
          scopeTransports: ['DEVK900001'],
          inventory: [],
          entries: [],
        },
      ),
    ),
  };
}

describe('ExactSourceHistoryService', () => {
  it('lists one filtered object component through ADK with an explicit context', async () => {
    const client = createClient();
    const operations = createOperations();
    const service = new ExactSourceHistoryService(client, operations);

    await service.listObjectVersions({
      objectName: 'zcl_test',
      objectType: 'clas',
      component: 'implementations',
    });

    expect(operations.listObjectSourceVersions).toHaveBeenCalledWith(
      'zcl_test',
      'clas',
      { component: 'implementations' },
      { client },
    );
  });

  it('reads exactly one explicitly selected immutable source URI', async () => {
    const client = createClient('CLASS zcl_test IMPLEMENTATION.');
    const service = new ExactSourceHistoryService(client, createOperations());

    await expect(
      service.getVersionSource({
        uri: '/sap/bc/adt/oo/classes/zcl_test/source/main/versions/2',
      }),
    ).resolves.toBe('CLASS zcl_test IMPLEMENTATION.');
  });

  it('passes ordered transports, selectors, and concurrency to ADK', async () => {
    const client = createClient();
    const operations = createOperations();
    const service = new ExactSourceHistoryService(client, operations);
    const selector = { type: ['CLAS', 'PROG'] };

    await service.buildTransportManifest({
      transports: ['DEVK900001', 'DEVK900002'],
      selector,
      concurrency: 3,
    });

    expect(operations.buildTransportSourceManifest).toHaveBeenCalledWith(
      ['DEVK900001', 'DEVK900002'],
      { selector, concurrency: 3 },
      { client },
    );
  });

  it('replaces adapter failures with bounded safe diagnostics', async () => {
    const client = createClient();
    const operations = createOperations();
    vi.mocked(operations.listObjectSourceVersions).mockRejectedValueOnce(
      new Error('Authorization: Basic c2VjcmV0 source=REPORT leaked'),
    );
    const service = new ExactSourceHistoryService(client, operations);

    await expect(
      service.listObjectVersions({
        objectName: 'ZCL_TEST',
        objectType: 'CLAS',
      }),
    ).rejects.toEqual(
      new ExactSourceHistoryServiceError(
        'SOURCE_VERSION_LIST_FAILED',
        'SAP ADT source-version metadata retrieval failed.',
      ),
    );
  });

  it('keeps the complete CTS inventory while stripping SAP object URIs', () => {
    const output = toMetadataOnlyTransportSourceManifest({
      requestedTransports: ['DEVK900001'],
      scopeTransports: ['DEVK900001'],
      inventory: [
        {
          pgmid: 'LIMU',
          type: 'METH',
          name: 'ZCL_TEST RUN',
          wbtype: 'CLAS',
          uri: '/sap/bc/adt/oo/classes/zcl_test',
          objFunc: '',
          sourceTransport: 'DEVK900001',
        },
      ],
      entries: [],
    });

    expect(output).toEqual({
      requestedTransports: ['DEVK900001'],
      scopeTransports: ['DEVK900001'],
      inventory: [
        {
          pgmid: 'LIMU',
          type: 'METH',
          name: 'ZCL_TEST RUN',
          wbtype: 'CLAS',
          objFunc: '',
          sourceTransport: 'DEVK900001',
        },
      ],
      entries: [],
    });
  });
});
