import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test, vi } from 'vitest';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, readFile: vi.fn(actual.readFile) };
});
import {
  createHttpBrokerReadinessProbe,
  createHttpBrokerOperations,
  createHttpDestinationContexts,
} from '../src/broker.js';

const brokerToken = randomUUID();

test('rejects a malformed broker destination summary without acquiring a destination lease', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const requests: Array<{
    url: string;
    authorization: string | null;
    redirect: RequestRedirect | undefined;
  }> = [];
  const readinessProbe = createHttpBrokerReadinessProbe({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async (input, init) => {
      requests.push({
        url: String(input),
        authorization: new Headers(init?.headers).get('x-adt-server-token'),
        redirect: init?.redirect,
      });
      return new Response(
        JSON.stringify({ data: { destination: 'not-an-array' } }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    },
  });

  try {
    await assert.rejects(() => readinessProbe(new AbortController().signal));
    assert.deepStrictEqual(requests, [
      {
        url: 'http://adt-api.internal/internal/adt-server/destinations',
        authorization: brokerToken,
        redirect: 'error',
      },
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('accepts an empty broker destination summary', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const requests: Array<{ url: string; method: string; token: string | null }> =
    [];
  const readinessProbe = createHttpBrokerReadinessProbe({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async (input, init) => {
      requests.push({
        url: String(input),
        method: init?.method ?? 'GET',
        token: new Headers(init?.headers).get('x-adt-server-token'),
      });
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  try {
    await assert.doesNotReject(() =>
      readinessProbe(new AbortController().signal),
    );
    assert.deepStrictEqual(requests, [
      {
        url: 'http://adt-api.internal/internal/adt-server/destinations',
        method: 'GET',
        token: brokerToken,
      },
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('rejects an unavailable broker destination summary', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const readinessProbe = createHttpBrokerReadinessProbe({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async () =>
      new Response(JSON.stringify({ data: [] }), { status: 503 }),
  });

  try {
    await assert.rejects(
      () => readinessProbe(new AbortController().signal),
      /ADT Server broker request failed \(503\)/u,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('redeems a frozen source reference through the private ADT broker', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const requests: Array<{ url: string; headers: Headers; body: unknown }> = [];
  const contexts = createHttpDestinationContexts({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async (input, init) => {
      requests.push({
        url: String(input),
        headers: new Headers(init?.headers),
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      return new Response(
        JSON.stringify({
          sourceUri: '/sap/bc/adt/oo/classes/zcl_scope/source/main',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  try {
    const resolved = await contexts.resolveFrozenSource({
      destination: 'trl-adt',
      systemSid: 'TRL',
      sourceRef: 'v1.opaque-reference',
    });

    assert.deepStrictEqual(resolved, {
      sourceUri: '/sap/bc/adt/oo/classes/zcl_scope/source/main',
    });
    assert.deepStrictEqual(
      requests.map((request) => ({
        url: request.url,
        authorization: request.headers.get('x-adt-server-token'),
        body: request.body,
      })),
      [
        {
          url: 'http://adt-api.internal/internal/adt-server/frozen-source-references:resolve',
          authorization: brokerToken,
          body: {
            destination: 'trl-adt',
            systemSid: 'TRL',
            sourceRef: 'v1.opaque-reference',
          },
        },
      ],
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('preserves a sidecar-issued source capability for local redemption', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const contexts = createHttpDestinationContexts({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async () =>
      new Response(JSON.stringify({ sourceCapability: 'src.v1.abc.def' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  });
  try {
    await assert.doesNotReject(async () => {
      assert.deepStrictEqual(
        await contexts.resolveFrozenSource({
          destination: 'trl-adt',
          systemSid: 'TRL',
          sourceRef: 'v1.opaque-reference',
        }),
        { sourceCapability: 'src.v1.abc.def' },
      );
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('reads an immutable source through the bounded ADT primitive', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const reads: Array<{ sourceUri: string; maxBytes: number }> = [];
  const operations = createHttpBrokerOperations({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async () =>
      new Response(
        JSON.stringify({
          leaseId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          destination: 'dev',
          version: 1,
          expiresAt: '2026-07-20T00:00:00.000Z',
          connection: {
            baseUrl: 'https://sap.example.test',
            sapClient: null,
            authMethod: 'basic',
            authConfig: { username: 'service', password: 'secret' },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    createClient: async () =>
      ({
        services: {
          sourceHistory: {
            async readVersionSourceBounded(
              sourceUri: string,
              maxBytes: number,
            ) {
              reads.push({ sourceUri, maxBytes });
              return 'CLASS zcl_safe DEFINITION.';
            },
          },
        },
      }) as never,
  });

  try {
    const result = await operations.readImmutableSource!({
      destination: 'dev',
      sourceUri: '/sap/bc/adt/oo/classes/zcl_safe/source/main/versions/1',
      maxBytes: 128,
    });

    assert.deepStrictEqual(result, {
      bytes: Buffer.byteLength('CLASS zcl_safe DEFINITION.', 'utf8'),
      source: 'CLASS zcl_safe DEFINITION.',
    });
    assert.deepStrictEqual(reads, [
      {
        sourceUri: '/sap/bc/adt/oo/classes/zcl_safe/source/main/versions/1',
        maxBytes: 128,
      },
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('lists all system transport headers through CTS FIND and filters ADT-side', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const transportFindCalls: unknown[] = [];
  const operations = createHttpBrokerOperations({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async () =>
      new Response(
        JSON.stringify({
          leaseId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          destination: 'dev',
          version: 1,
          expiresAt: '2026-07-20T00:00:00.000Z',
          connection: {
            baseUrl: 'https://sap.example.test',
            sapClient: null,
            authMethod: 'basic',
            authConfig: { username: 'service', password: 'secret' },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    createClient: async () =>
      ({
        adt: {
          cts: {
            transports: {
              async find(input: unknown) {
                transportFindCalls.push(input);
                return {
                  values: {
                    DATA: {
                      CTS_REQ_HEADER: [
                        {
                          TRKORR: 'DEVK900001',
                          AS4USER: 'ALICE',
                          AS4TEXT: 'Safe refactor',
                          TRSTATUS: 'D',
                          TRFUNCTION: 'K',
                          AS4DATE: '2026-07-19',
                          AS4TIME: '12:00:00',
                        },
                        {
                          TRKORR: 'DEVK900002',
                          AS4USER: 'BOB',
                          AS4TEXT: 'Released change',
                          TRSTATUS: 'R',
                          TRFUNCTION: 'W',
                        },
                      ],
                    },
                  },
                };
              },
            },
          },
        },
      }) as never,
  });

  try {
    const result = await operations.listTransports('dev', {
      owner: 'alice',
      status: 'modifiable',
      includeTasks: false,
    });
    assert.deepStrictEqual(transportFindCalls, [
      { _action: 'FIND', user: '*', trfunction: '*' },
    ]);
    assert.deepStrictEqual(result, [
      {
        trkorr: 'DEVK900001',
        owner: 'ALICE',
        description: 'Safe refactor',
        status: 'modifiable',
        statusRaw: 'D',
        trFunction: 'K',
        changedAt: '2026-07-19T12:00:00Z',
      },
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('maps transport detail and objects to canonical REST references without ADT URIs', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  let lease = 0;
  const operations = createHttpBrokerOperations({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async (input) => {
      if (String(input).endsWith(':acquire')) {
        lease += 1;
        return new Response(
          JSON.stringify({
            leaseId: `00000000-0000-4000-8000-${String(lease).padStart(12, '0')}`,
            destination: 'dev',
            version: 1,
            expiresAt: '2026-07-20T00:00:00.000Z',
            connection: {
              baseUrl: 'https://sap.example.test',
              sapClient: null,
              authMethod: 'basic',
              authConfig: { username: 'service', password: 'secret' },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(null, { status: 204 });
    },
    createClient: async () =>
      ({
        adt: {
          cts: {
            transportrequests: {
              async get() {
                return {
                  root: {
                    request: {
                      number: 'DEVK900001',
                      owner: 'ALICE',
                      desc: 'Safe refactor',
                      status: 'D',
                      type: 'K',
                      abap_object: [
                        {
                          type: 'CLAS/OC',
                          name: 'zcl_safe',
                          pgmid: 'R3TR',
                          uri: '/sap/bc/adt/oo/classes/zcl_safe',
                        },
                      ],
                      all_objects: {
                        abap_object: [
                          {
                            type: 'CLAS/OC',
                            name: 'zcl_safe',
                            pgmid: 'R3TR',
                            uri: '/sap/bc/adt/oo/classes/zcl_safe',
                          },
                        ],
                      },
                      task: [
                        {
                          number: 'DEVK900002',
                          owner: 'ALICE',
                          desc: 'Implementation task',
                          status: 'D',
                          type: 'S',
                          abap_object: [
                            {
                              type: 'INTF',
                              name: 'zif_safe',
                              uri: '/sap/bc/adt/oo/interfaces/zif_safe',
                            },
                          ],
                        },
                      ],
                    },
                  },
                };
              },
            },
          },
        },
      }) as never,
  });

  try {
    const detail = await operations.getTransportDetail!('dev', 'DEVK900001');
    const objects = await operations.listTransportObjects!('dev', 'DEVK900001');
    assert.deepStrictEqual(detail, {
      trkorr: 'DEVK900001',
      owner: 'ALICE',
      description: 'Safe refactor',
      status: 'modifiable',
      statusRaw: 'D',
      trFunction: 'K',
      tasks: [
        {
          trkorr: 'DEVK900002',
          owner: 'ALICE',
          description: 'Implementation task',
          status: 'modifiable',
          statusRaw: 'D',
          trFunction: 'S',
          parentTrkorr: 'DEVK900001',
          objects: [
            {
              canonicalKey: 'INTF:ZIF_SAFE',
              objectType: 'INTF',
              objectName: 'ZIF_SAFE',
            },
          ],
        },
      ],
      objects: [
        {
          canonicalKey: 'CLAS:ZCL_SAFE',
          objectType: 'CLAS',
          objectName: 'ZCL_SAFE',
          pgmid: 'R3TR',
        },
      ],
    });
    assert.deepStrictEqual(objects, [
      {
        canonicalKey: 'CLAS:ZCL_SAFE',
        objectType: 'CLAS',
        objectName: 'ZCL_SAFE',
        pgmid: 'R3TR',
      },
      {
        canonicalKey: 'INTF:ZIF_SAFE',
        objectType: 'INTF',
        objectName: 'ZIF_SAFE',
      },
    ]);
    assert.ok(!JSON.stringify({ detail, objects }).includes('/sap/bc/adt/'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('maps a bounded package quick search without exposing ADT URIs', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const queries: unknown[] = [];
  const operations = createHttpBrokerOperations({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async (input) => {
      if (String(input).endsWith(':acquire')) {
        return new Response(
          JSON.stringify({
            leaseId: '44444444-4444-4444-8444-444444444444',
            destination: 'dev',
            version: 1,
            expiresAt: '2026-07-20T00:00:00.000Z',
            connection: {
              baseUrl: 'https://sap.example.test',
              sapClient: null,
              authMethod: 'basic',
              authConfig: { username: 'service', password: 'secret' },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(null, { status: 204 });
    },
    createClient: async () =>
      ({
        adt: {
          repository: {
            informationsystem: {
              search: {
                async quickSearch(input: unknown) {
                  queries.push(input);
                  return {
                    objectReferences: {
                      objectReference: [
                        {
                          type: 'DEVC/K',
                          name: 'zalpha',
                          packageName: 'zroot',
                          description: 'Alpha',
                          uri: '/sap/bc/adt/packages/zalpha',
                        },
                        {
                          type: 'DEVC/K',
                          name: 'zalpha',
                          uri: '/sap/bc/adt/packages/zalpha',
                        },
                        {
                          type: 'CLAS/OC',
                          name: 'ZCL_NOT_A_PACKAGE',
                          uri: '/sap/bc/adt/oo/classes/zcl_not_a_package',
                        },
                      ],
                    },
                  };
                },
              },
            },
          },
        },
      }) as never,
  });

  try {
    const result = await operations.searchPackages('dev', {
      q: 'za',
      maxResults: 2,
    });
    assert.deepStrictEqual(queries, [
      { query: 'za*', objectType: 'DEVC', maxResults: 3 },
    ]);
    assert.deepStrictEqual(result, {
      data: [{ name: 'ZALPHA', parent: 'ZROOT', description: 'Alpha' }],
      truncated: true,
    });
    assert.ok(!JSON.stringify(result).includes('/sap/bc/adt/'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('maps one rooted ADT subpackage tree to canonical package nodes without ADT URIs', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const treeCalls: unknown[] = [];
  const operations = createHttpBrokerOperations({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async () =>
      new Response(
        JSON.stringify({
          leaseId: 'abababab-abab-4bab-8bab-abababababab',
          destination: 'dev',
          version: 1,
          expiresAt: '2026-07-20T00:00:00.000Z',
          connection: {
            baseUrl: 'https://sap.example.test',
            sapClient: null,
            authMethod: 'basic',
            authConfig: { username: 'service', password: 'secret' },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    createClient: async () =>
      ({
        adt: {
          packages: {
            async tree(params: unknown) {
              treeCalls.push(params);
              return {
                packageTree: {
                  treeNode: [
                    {
                      type: 'DEVC/K',
                      name: 'ZROOT',
                      description: 'Root package',
                      uri: '/sap/bc/adt/packages/zroot',
                    },
                    {
                      type: 'DEVC/K',
                      name: 'ZCHILD',
                      description: 'Child package',
                      superPackageRef: {
                        name: 'ZROOT',
                        uri: '/sap/bc/adt/packages/zroot',
                      },
                      uri: '/sap/bc/adt/packages/zchild',
                    },
                  ],
                },
              };
            },
          },
        },
      }) as never,
  });

  try {
    const result = await operations.getPackageTree!('dev', 'zroot');
    assert.deepStrictEqual(treeCalls, [{ packagename: 'ZROOT', type: 'sub' }]);
    assert.deepStrictEqual(result, {
      data: [
        { name: 'ZROOT', description: 'Root package' },
        {
          name: 'ZCHILD',
          parent: 'ZROOT',
          description: 'Child package',
        },
      ],
      truncated: false,
    });
    assert.ok(!JSON.stringify(result).includes('/sap/bc/adt/'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('falls back to bounded package metadata traversal when the ADT tree capability is unavailable', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const getCalls: string[] = [];
  const unsupportedTree = Object.assign(new Error('not acceptable'), {
    name: 'AdtError',
    status: 406,
  });
  const operations = createHttpBrokerOperations({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async () =>
      new Response(
        JSON.stringify({
          leaseId: 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd',
          destination: 'dev',
          version: 1,
          expiresAt: '2026-07-20T00:00:00.000Z',
          connection: {
            baseUrl: 'https://sap.example.test',
            sapClient: null,
            authMethod: 'basic',
            authConfig: { username: 'service', password: 'secret' },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    createClient: async () =>
      ({
        adt: {
          packages: {
            async tree() {
              throw unsupportedTree;
            },
            async get(name: string) {
              getCalls.push(name);
              if (name === 'ZROOT') {
                return {
                  package: {
                    name: 'ZROOT',
                    description: 'Root package',
                    subPackages: {
                      packageRef: [
                        {
                          name: 'ZCHILD',
                          description: 'Child package',
                          uri: '/sap/bc/adt/packages/zchild',
                        },
                      ],
                    },
                  },
                };
              }
              return {
                package: {
                  name: 'ZCHILD',
                  superPackage: {
                    name: 'ZROOT',
                    uri: '/sap/bc/adt/packages/zroot',
                  },
                },
              };
            },
          },
        },
      }) as never,
  });

  try {
    const result = await operations.getPackageTree!('dev', 'zroot');
    assert.deepStrictEqual(getCalls, ['ZROOT', 'ZCHILD']);
    assert.deepStrictEqual(result, {
      data: [
        { name: 'ZROOT', description: 'Root package' },
        {
          name: 'ZCHILD',
          parent: 'ZROOT',
          description: 'Child package',
        },
      ],
      truncated: false,
    });
    assert.ok(!JSON.stringify(result).includes('/sap/bc/adt/'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('maps a bounded object quick search to canonical REST objects without ADT URIs', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const queries: unknown[] = [];
  const operations = createHttpBrokerOperations({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async (input) => {
      if (String(input).endsWith(':acquire')) {
        return new Response(
          JSON.stringify({
            leaseId: '55555555-5555-4555-8555-555555555555',
            destination: 'dev',
            version: 1,
            expiresAt: '2026-07-20T00:00:00.000Z',
            connection: {
              baseUrl: 'https://sap.example.test',
              sapClient: null,
              authMethod: 'basic',
              authConfig: { username: 'service', password: 'secret' },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(null, { status: 204 });
    },
    createClient: async () =>
      ({
        adt: {
          repository: {
            informationsystem: {
              search: {
                async quickSearch(input: unknown) {
                  queries.push(input);
                  return {
                    objectReferences: {
                      objectReference: [
                        {
                          type: 'CLAS/OC',
                          name: 'zcl_alpha',
                          packageName: 'zpkg',
                          description: 'Alpha object',
                          uri: '/sap/bc/adt/oo/classes/zcl_alpha',
                        },
                        {
                          type: 'DEVC/K',
                          name: 'ZPKG',
                          uri: '/sap/bc/adt/packages/zpkg',
                        },
                        {
                          type: 'INTF',
                          name: 'zif_without_uri',
                        },
                      ],
                    },
                  };
                },
              },
            },
          },
        },
      }) as never,
  });

  try {
    const result = await operations.searchObjects('dev', {
      query: 'zcl',
      packageName: 'ZPKG',
      objectType: 'CLAS',
      maxResults: 2,
    });
    assert.deepStrictEqual(queries, [
      {
        query: 'zcl*',
        packageName: 'ZPKG',
        objectType: 'CLAS',
        maxResults: 3,
      },
    ]);
    assert.deepStrictEqual(result, {
      data: [
        {
          canonicalKey: 'CLAS:ZCL_ALPHA',
          objectType: 'CLAS',
          objectName: 'ZCL_ALPHA',
          packageName: 'ZPKG',
          description: 'Alpha object',
        },
      ],
      truncated: true,
    });
    assert.ok(!JSON.stringify(result).includes('/sap/bc/adt/'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('maps direct package objects to canonical REST objects without foreign rows or ADT URIs', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const queries: unknown[] = [];
  const operations = createHttpBrokerOperations({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async (input) => {
      if (String(input).endsWith(':acquire')) {
        return new Response(
          JSON.stringify({
            leaseId: '66666666-6666-4666-8666-666666666666',
            destination: 'dev',
            version: 1,
            expiresAt: '2026-07-20T00:00:00.000Z',
            connection: {
              baseUrl: 'https://sap.example.test',
              sapClient: null,
              authMethod: 'basic',
              authConfig: { username: 'service', password: 'secret' },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(null, { status: 204 });
    },
    createClient: async () =>
      ({
        adt: {
          repository: {
            informationsystem: {
              search: {
                async quickSearch(input: unknown) {
                  queries.push(input);
                  return {
                    objectReferences: {
                      objectReference: [
                        {
                          type: 'CLAS/OC',
                          name: 'zcl_alpha',
                          packageName: 'zpkg',
                          uri: '/sap/bc/adt/oo/classes/zcl_alpha',
                        },
                        {
                          type: 'DEVC/K',
                          name: 'ZPKG',
                          packageName: 'ZPKG',
                          uri: '/sap/bc/adt/packages/zpkg',
                        },
                        {
                          type: 'INTF',
                          name: 'zif_other',
                          packageName: 'ZOTHER',
                          uri: '/sap/bc/adt/oo/interfaces/zif_other',
                        },
                      ],
                    },
                  };
                },
              },
            },
          },
        },
      }) as never,
  });

  try {
    const result = await operations.listPackageObjects!('dev', 'zpkg');
    assert.deepStrictEqual(queries, [
      { query: '*', packageName: 'ZPKG', maxResults: 5_001 },
    ]);
    assert.deepStrictEqual(result, {
      data: [
        {
          canonicalKey: 'CLAS:ZCL_ALPHA',
          objectType: 'CLAS',
          objectName: 'ZCL_ALPHA',
          packageName: 'ZPKG',
        },
      ],
      truncated: false,
    });
    assert.ok(!JSON.stringify(result).includes('/sap/bc/adt/'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('resolves canonical object metadata through the upstream resolver without leaking ADT links', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const propertyReads: unknown[] = [];
  const operations = createHttpBrokerOperations({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async () =>
      new Response(
        JSON.stringify({
          leaseId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          destination: 'dev',
          version: 1,
          expiresAt: '2026-07-20T00:00:00.000Z',
          connection: {
            baseUrl: 'https://sap.example.test',
            sapClient: null,
            authMethod: 'basic',
            authConfig: { username: 'service', password: 'secret' },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    createClient: async () =>
      ({
        adt: {
          repository: {
            informationsystem: {
              objectProperties: {
                async values(input: unknown) {
                  propertyReads.push(input);
                  return {
                    objectProperties: {
                      object: {
                        type: 'CLAS',
                        package: 'ZPKG',
                        text: 'Safe class',
                        uri: '/sap/bc/adt/oo/classes/zcl_safe',
                        link: [
                          {
                            rel: 'http://www.sap.com/adt/relations/versions',
                            href: 'versions',
                            title: 'Version history',
                          },
                          {
                            rel: 'http://www.sap.com/adt/relations/source',
                            href: 'https://invalid.example/source',
                          },
                        ],
                      },
                      property: [
                        {
                          facet: 'package',
                          name: 'ZPKG',
                          displayName: 'Package',
                          hasChildrenOfSameFacet: false,
                        },
                      ],
                    },
                  };
                },
              },
            },
          },
        },
      }) as never,
  });

  try {
    const result = await operations.getObjectMetadata!(
      'dev',
      'CLAS',
      'zcl_safe',
    );
    assert.deepStrictEqual(propertyReads, [
      {
        uri: '/sap/bc/adt/oo/classes/zcl_safe',
        facets: ['package', 'appl'],
      },
    ]);
    assert.deepStrictEqual(result, {
      object: {
        canonicalKey: 'CLAS:ZCL_SAFE',
        objectType: 'CLAS',
        objectName: 'ZCL_SAFE',
        packageName: 'ZPKG',
        description: 'Safe class',
      },
      metadata: {
        adtObjectType: 'CLAS',
        packageName: 'ZPKG',
        description: 'Safe class',
      },
      facets: [
        {
          facet: 'package',
          name: 'ZPKG',
          displayName: 'Package',
          hasChildrenOfSameFacet: false,
        },
      ],
      capabilities: [
        {
          relation: 'http://www.sap.com/adt/relations/versions',
          capability: 'versions',
          title: 'Version history',
        },
      ],
    });
    assert.ok(!JSON.stringify(result).includes('uri'));
    assert.ok(!JSON.stringify(result).includes('href'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('maps object source history to metadata only without leaking immutable source URIs', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const versionReads: string[] = [];
  const operations = createHttpBrokerOperations({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async () =>
      new Response(
        JSON.stringify({
          leaseId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
          destination: 'dev',
          version: 1,
          expiresAt: '2026-07-20T00:00:00.000Z',
          connection: {
            baseUrl: 'https://sap.example.test',
            sapClient: null,
            authMethod: 'basic',
            authConfig: { username: 'service', password: 'secret' },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    createClient: async () =>
      ({
        adt: {
          repository: {
            informationsystem: {
              objectProperties: {
                async values() {
                  return {
                    objectProperties: {
                      object: {
                        link: [
                          {
                            rel: 'http://www.sap.com/adt/relations/versions',
                            href: 'versions',
                          },
                        ],
                      },
                    },
                  };
                },
              },
            },
          },
        },
        services: {
          sourceHistory: {
            async listVersions(versionsUri: string) {
              versionReads.push(versionsUri);
              return [
                {
                  id: 'version-2',
                  ordinal: 0,
                  title: 'Latest change',
                  author: 'ALICE',
                  transports: ['DEVK900001'],
                  sourceUri:
                    '/sap/bc/adt/oo/classes/zcl_safe/source/main/versions/2',
                },
              ];
            },
          },
        },
      }) as never,
  });

  try {
    const result = await operations.getObjectSourceHistory!(
      'dev',
      'CLAS',
      'ZCL_SAFE',
    );
    assert.deepStrictEqual(versionReads, [
      '/sap/bc/adt/oo/classes/zcl_safe/versions',
    ]);
    assert.deepStrictEqual(result, {
      available: true,
      versions: [
        {
          id: 'version-2',
          ordinal: 0,
          title: 'Latest change',
          author: 'ALICE',
          transports: ['DEVK900001'],
        },
      ],
    });
    assert.ok(!JSON.stringify(result).includes('uri'));
    assert.ok(!JSON.stringify(result).includes('href'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('reads a bounded canonical object source without accepting or returning an ADT URI', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const sourceReads: Array<{
    path: string;
    maxBytes: number;
    accept?: string;
  }> = [];
  const operations = createHttpBrokerOperations({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async () =>
      new Response(
        JSON.stringify({
          leaseId: '12121212-1212-4212-8212-121212121212',
          destination: 'dev',
          version: 1,
          expiresAt: '2026-07-20T00:00:00.000Z',
          connection: {
            baseUrl: 'https://sap.example.test',
            sapClient: null,
            authMethod: 'basic',
            authConfig: { username: 'service', password: 'secret' },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    createClient: async () =>
      ({
        async readTextBounded(
          path: string,
          maxBytes: number,
          options: { headers?: { Accept?: string } },
        ) {
          sourceReads.push({
            path,
            maxBytes,
            accept: options.headers?.Accept,
          });
          return 'CLASS zcl_safe DEFINITION.';
        },
      }) as never,
  });

  try {
    const result = await operations.readObjectSource!({
      destination: 'dev',
      objectType: 'CLAS',
      objectName: 'ZCL_SAFE',
      version: 'inactive',
    });
    assert.deepStrictEqual(sourceReads, [
      {
        path: '/sap/bc/adt/oo/classes/zcl_safe/source/main?version=inactive',
        maxBytes: 2 * 1024 * 1024,
        accept: 'text/plain',
      },
    ]);
    assert.deepStrictEqual(result, {
      bytes: Buffer.byteLength('CLASS zcl_safe DEFINITION.', 'utf8'),
      source: 'CLASS zcl_safe DEFINITION.',
    });
    assert.ok(!JSON.stringify(result).includes('uri'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('runs ATC from a canonical package scope and retains only the trusted documentation relation', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const calls: Array<{ kind: string; value: unknown }> = [];
  const operations = createHttpBrokerOperations({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async (input) => {
      if (String(input).endsWith(':acquire')) {
        return new Response(
          JSON.stringify({
            leaseId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
            destination: 'dev',
            version: 1,
            expiresAt: '2026-07-20T00:00:00.000Z',
            connection: {
              baseUrl: 'https://sap.example.test',
              sapClient: null,
              authMethod: 'basic',
              authConfig: { username: 'service', password: 'secret' },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(null, { status: 204 });
    },
    createClient: async () =>
      ({
        adt: {
          atc: {
            customizing: {
              async get() {
                calls.push({ kind: 'customizing', value: undefined });
                return { customizing: { properties: { property: [] } } };
              },
            },
            worklists: {
              async create(value: unknown) {
                calls.push({ kind: 'create', value });
                return { worklist: { id: 'worklist-1' } };
              },
              async get(value: unknown, options: unknown) {
                calls.push({ kind: 'get', value: { value, options } });
                return {
                  worklist: {
                    objects: {
                      object: [
                        {
                          uri: '/sap/bc/adt/oo/classes/zcl_safe',
                          type: 'CLAS',
                          name: 'ZCL_SAFE',
                          findings: {
                            finding: [
                              {
                                uri: '/sap/bc/adt/atc/findings/itemid/ABC/index/1',
                                priority: '2',
                                checkId: 'SCI',
                                checkTitle: 'Safe check',
                                messageTitle: 'Avoid unsafe access',
                                location:
                                  '/sap/bc/adt/oo/classes/zcl_safe/source/main?start=12',
                                link: [
                                  {
                                    rel: 'http://www.sap.com/adt/relations/documentation',
                                    href: '/sap/bc/adt/documentation/atc/documents/itemid/ABC/index/1',
                                  },
                                ],
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                };
              },
            },
            runs: {
              async post(value: unknown, body: unknown) {
                calls.push({ kind: 'run', value: { value, body } });
              },
            },
          },
        },
      }) as never,
  });

  try {
    const result = await operations.runAtc!({
      destination: 'dev',
      scope: { kind: 'package', packageName: '$TEST' },
    });

    assert.deepStrictEqual(result, {
      checkVariant: 'DEFAULT',
      findings: [
        {
          checkId: 'SCI',
          checkTitle: 'Safe check',
          messageText: 'Avoid unsafe access',
          priority: 2,
          objectType: 'CLAS',
          objectName: 'ZCL_SAFE',
          lineStart: 12,
          lineEnd: 12,
          documentationUri:
            '/sap/bc/adt/documentation/atc/documents/itemid/ABC/index/1',
        },
      ],
    });
    assert.deepStrictEqual(calls, [
      { kind: 'customizing', value: undefined },
      { kind: 'create', value: { checkVariant: 'DEFAULT' } },
      {
        kind: 'run',
        value: {
          value: { worklistId: 'worklist-1' },
          body: {
            run: {
              maximumVerdicts: 10000,
              objectSets: {
                objectSet: [
                  {
                    kind: 'inclusive',
                    objectReferences: {
                      objectReference: [{ uri: '/sap/bc/adt/packages/$TEST' }],
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        kind: 'get',
        value: {
          value: 'worklist-1',
          options: { includeExemptedFindings: 'false' },
        },
      },
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('enriches ATC findings with check categories from the variant form template', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const documentationReads: string[] = [];
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const formtemplateCalls: unknown[] = [];
  const operations = createHttpBrokerOperations({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async (input) => {
      if (String(input).endsWith(':acquire')) {
        return new Response(
          JSON.stringify({
            leaseId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
            destination: 'dev',
            version: 1,
            expiresAt: '2026-07-20T00:00:00.000Z',
            connection: {
              baseUrl: 'https://sap.example.test',
              sapClient: null,
              authMethod: 'basic',
              authConfig: { username: 'service', password: 'secret' },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(null, { status: 204 });
    },
    createClient: async () =>
      ({
        adt: {
          atc: {
            customizing: {
              async get() {
                return { customizing: { properties: { property: [] } } };
              },
            },
            worklists: {
              async create(value: unknown) {
                return { worklist: { id: 'worklist-1' } };
              },
              async get() {
                return {
                  worklist: {
                    objects: {
                      object: [
                        {
                          uri: '/sap/bc/adt/oo/classes/zcl_safe',
                          type: 'CLAS',
                          name: 'ZCL_SAFE',
                          findings: {
                            finding: [
                              {
                                uri: '/sap/bc/adt/atc/findings/itemid/ABC/index/1',
                                priority: '2',
                                checkId: 'SCI',
                                checkTitle: 'Safe check',
                                messageTitle: 'Avoid unsafe access',
                                location:
                                  '/sap/bc/adt/oo/classes/zcl_safe/source/main?start=12',
                              },
                              {
                                uri: '/sap/bc/adt/atc/findings/itemid/ABC/index/2',
                                priority: '2',
                                checkId: 'UNKNOWN_IMPL',
                                checkTitle: 'Uncatalogued check',
                                messageTitle: 'Outside the catalog',
                                location:
                                  '/sap/bc/adt/oo/classes/zcl_safe/source/main?start=20',
                              },
                              {
                                uri: '/sap/bc/adt/atc/findings/itemid/DEF/index/1',
                                priority: '2',
                                checkId: '6A277D3B1C4E4F80A9B2C3D4E5F60718',
                                checkTitle: 'Guid check',
                                messageTitle: 'Guid-shaped checkId',
                                location:
                                  '/sap/bc/adt/oo/classes/zcl_safe/source/main?start=30',
                                link: [
                                  {
                                    rel: 'http://www.sap.com/adt/relations/documentation',
                                    href: '/sap/bc/adt/documentation/atc/documents/itemid/DEF/index/1',
                                  },
                                ],
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                };
              },
            },
            runs: {
              async post() {
                return undefined;
              },
            },
            checkvariants: {
              async formtemplate(params: unknown) {
                formtemplateCalls.push(params);
                return {
                  formTemplate: {
                    availableCheckCategories: {
                      availableCheckCategory: [
                        {
                          checkCategoryObject: {
                            name: 'CI_PERFORMANCE',
                            description: 'Performance',
                          },
                          check: [
                            {
                              checkObject: {
                                name: 'CI_ANALYZE_WHERE',
                                content: {
                                  category: { name: 'CI_PERFORMANCE' },
                                  implementingClass: { name: 'SCI' },
                                },
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                };
              },
            },
          },
        },
        async readTextBounded(uri: string) {
          documentationReads.push(uri);
          // The GUID finding's page names the catalogued class; the
          // uncatalogued finding's page names a class outside the catalog
          const checkClass = uri.endsWith('/DEF/index/1')
            ? 'SCI'
            : 'CL_UNCATALOGUED_IMPL';
          return `<h3>Appl. Comp. Check / Check Class / Message Code</h3><p>BC-ABA-LA / ${checkClass} / 0501</p>`;
        },
      }) as never,
  });

  try {
    const result = await operations.runAtc!({
      destination: 'dev',
      scope: { kind: 'package', packageName: '$TEST' },
    });

    // The catalogued check gains its category directly; the uncatalogued
    // one keeps none; the GUID-checkId finding gains its category through
    // the documentation bridge
    assert.ok(result.findings[0]!.checkCategory === 'CI_PERFORMANCE');
    assert.ok(result.findings[1]!.checkCategory === undefined);
    assert.ok(result.findings[2]!.checkCategory === 'CI_PERFORMANCE');
    // The form template is fetched for the run's resolved variant
    assert.deepStrictEqual(formtemplateCalls, [{ chkvName: 'DEFAULT' }]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('runs ATC with unavailable check categories without failing the run', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const operations = createHttpBrokerOperations({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async (input) => {
      if (String(input).endsWith(':acquire')) {
        return new Response(
          JSON.stringify({
            leaseId: 'abababab-abab-4bab-8bab-abababababab',
            destination: 'dev',
            version: 1,
            expiresAt: '2026-07-20T00:00:00.000Z',
            connection: {
              baseUrl: 'https://sap.example.test',
              sapClient: null,
              authMethod: 'basic',
              authConfig: { username: 'service', password: 'secret' },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(null, { status: 204 });
    },
    createClient: async () =>
      ({
        adt: {
          atc: {
            customizing: {
              async get() {
                return { customizing: { properties: { property: [] } } };
              },
            },
            worklists: {
              async create() {
                return { worklist: { id: 'worklist-1' } };
              },
              async get() {
                return {
                  worklist: {
                    objects: {
                      object: [
                        {
                          uri: '/sap/bc/adt/oo/classes/zcl_safe',
                          type: 'CLAS',
                          name: 'ZCL_SAFE',
                          findings: {
                            finding: [
                              {
                                uri: '/sap/bc/adt/atc/findings/itemid/ABC/index/1',
                                priority: '2',
                                checkId: 'SCI',
                                checkTitle: 'Safe check',
                                messageTitle: 'Avoid unsafe access',
                                location:
                                  '/sap/bc/adt/oo/classes/zcl_safe/source/main?start=12',
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                };
              },
            },
            runs: {
              async post() {
                return undefined;
              },
            },
            // No checkvariants surface: enrichment must degrade to a no-op
          },
        },
      }) as never,
  });

  try {
    const result = await operations.runAtc!({
      destination: 'dev',
      scope: { kind: 'package', packageName: '$TEST' },
    });

    assert.ok(result.findings.length === 1);
    assert.ok(result.findings[0]!.checkCategory === undefined);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('reads trusted ATC documentation through the bounded text primitive', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const reads: unknown[] = [];
  const operations = createHttpBrokerOperations({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async (input) =>
      String(input).endsWith(':acquire')
        ? new Response(
            JSON.stringify({
              leaseId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
              destination: 'dev',
              version: 1,
              expiresAt: '2026-07-20T00:00:00.000Z',
              connection: {
                baseUrl: 'https://sap.example.test',
                sapClient: null,
                authMethod: 'basic',
                authConfig: { username: 'service', password: 'secret' },
              },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          )
        : new Response(null, { status: 204 }),
    createClient: async () =>
      ({
        async readTextBounded(uri: string, maxBytes: number, options: unknown) {
          reads.push({ uri, maxBytes, options });
          return '<p>Use a safe API.</p>';
        },
      }) as never,
  });

  try {
    const result = await operations.readAtcFindingDocumentation!({
      destination: 'dev',
      documentationUri:
        '/sap/bc/adt/documentation/atc/documents/itemid/ABC/index/1',
      maxBytes: 1024,
    });

    assert.deepStrictEqual(result, {
      bytes: Buffer.byteLength('<p>Use a safe API.</p>', 'utf8'),
      html: '<p>Use a safe API.</p>',
    });
    assert.deepStrictEqual(reads, [
      {
        uri: '/sap/bc/adt/documentation/atc/documents/itemid/ABC/index/1',
        maxBytes: 1024,
        options: {
          headers: { Accept: 'application/vnd.sap.adt.docu.v1+html' },
        },
      },
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('releases an opaque REST lease with redacted success and failure outcomes', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const requests: Array<{ url: string; body?: unknown }> = [];
  let calls = 0;
  const operations = createHttpBrokerOperations({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async (input, init) => {
      const url = String(input);
      requests.push({
        url,
        ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}),
      });
      if (url.endsWith(':acquire')) {
        return new Response(
          JSON.stringify({
            leaseId:
              calls++ === 0
                ? '11111111-1111-4111-8111-111111111111'
                : '22222222-2222-4222-8222-222222222222',
            destination: 'dev',
            version: 1,
            expiresAt: '2026-07-20T00:00:00.000Z',
            connection: {
              baseUrl: 'https://sap.example.test',
              sapClient: null,
              authMethod: 'basic',
              authConfig: { username: 'service', password: 'secret' },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(null, { status: 204 });
    },
    createClient: async () => {
      if (calls === 2) throw new Error('client setup failed');
      return {
        services: {
          transports: {
            async list() {
              return [];
            },
          },
        },
        adt: {
          cts: {
            transports: {
              async find() {
                return { values: { DATA: { CTS_REQ_HEADER: [] } } };
              },
            },
          },
        },
      } as never;
    },
  });

  try {
    await operations.listTransports('dev');
    await assert.rejects(() => operations.listTransports('dev'));
    const releases = requests.filter((request) =>
      request.url.endsWith(':release'),
    );
    assert.deepStrictEqual(
      releases.map((request) => {
        const body = request.body as Record<string, unknown>;
        assert.ok(typeof body.durationMs === 'number' && body.durationMs >= 0);
        const { durationMs: _durationMs, ...safeBody } = body;
        return safeBody;
      }),
      [
        {
          leaseId: '11111111-1111-4111-8111-111111111111',
          operation: 'list_transports',
          outcome: 'succeeded',
        },
        {
          leaseId: '22222222-2222-4222-8222-222222222222',
          operation: 'list_transports',
          outcome: 'failed',
          errorCode: 'client_creation_failed',
        },
      ],
    );
    assert.ok(!JSON.stringify(releases).includes('secret'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('releases an MCP destination context through the private broker', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adt-server-broker-'));
  const tokenFile = path.join(directory, 'broker-token');
  await writeFile(tokenFile, `${brokerToken}\n`, 'utf8');
  const requests: Array<{ url: string; body?: unknown }> = [];
  const contexts = createHttpDestinationContexts({
    baseUrl: 'http://adt-api.internal',
    tokenFile,
    fetch: async (input, init) => {
      const url = String(input);
      requests.push({
        url,
        ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}),
      });
      if (url.endsWith(':acquire')) {
        return new Response(
          JSON.stringify({
            leaseId: '33333333-3333-4333-8333-333333333333',
            destination: 'dev',
            version: 1,
            expiresAt: '2026-07-20T00:00:00.000Z',
            connection: {
              baseUrl: 'https://sap.example.test',
              sapClient: null,
              authMethod: 'basic',
              authConfig: { username: 'service', password: 'secret' },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(null, { status: 204 });
    },
  });

  try {
    const lease = await contexts.leaseProvider.acquire({ destination: 'dev' });
    await lease.release();
    const release = requests.find((request) =>
      request.url.endsWith(':release'),
    );
    assert.ok(release);
    assert.deepStrictEqual(release.body, {
      leaseId: '33333333-3333-4333-8333-333333333333',
      operation: 'mcp_destination_context',
      outcome: 'succeeded',
      durationMs: 0,
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

const validReadinessSummary = {
  key: 'dev',
  displayName: 'Development',
  systemSids: ['DEV'],
  authConfigured: true,
  version: 1,
};

test.each([
  ['populated', { data: [validReadinessSummary] }, true],
  [
    'whitespace-only key',
    { data: [{ ...validReadinessSummary, key: ' ' }] },
    false,
  ],
  [
    'blank display name',
    { data: [{ ...validReadinessSummary, displayName: '' }] },
    false,
  ],
  [
    'blank system SID',
    { data: [{ ...validReadinessSummary, systemSids: [' '] }] },
    false,
  ],
  ['zero version', { data: [{ ...validReadinessSummary, version: 0 }] }, false],
  [
    'negative version',
    { data: [{ ...validReadinessSummary, version: -1 }] },
    false,
  ],
  [
    'unknown entry field',
    { data: [{ ...validReadinessSummary, extra: 'private' }] },
    false,
  ],
  ['unknown response field', { data: [], extra: 'private' }, false],
  [
    'mixed valid and invalid entries',
    { data: [validReadinessSummary, { ...validReadinessSummary, key: '' }] },
    false,
  ],
])(
  'validates %s broker readiness summary against the REST contract',
  async (_name, body, accepted) => {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), 'adt-readiness-contract-'),
    );
    try {
      const tokenFile = path.join(directory, 'token');
      await writeFile(tokenFile, 'synthetic-token');
      const probe = createHttpBrokerReadinessProbe({
        baseUrl: 'http://broker.invalid',
        tokenFile,
        fetch: async () => new Response(JSON.stringify(body), { status: 200 }),
      });
      if (accepted) {
        await assert.doesNotReject(() => probe(new AbortController().signal));
      } else {
        await assert.rejects(
          () => probe(new AbortController().signal),
          /invalid destination summary/u,
        );
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test('already aborted readiness never reads a token or fetches', async () => {
  const controller = new AbortController();
  controller.abort();
  const fetcher = vi.fn();
  vi.mocked(readFile).mockClear();
  const probe = createHttpBrokerReadinessProbe({
    baseUrl: 'http://broker.invalid',
    tokenFile: '/not-read',
    fetch: fetcher,
  });
  await assert.rejects(() => probe(controller.signal), { name: 'AbortError' });
  assert.strictEqual(vi.mocked(readFile).mock.calls.length, 0);
  assert.strictEqual(fetcher.mock.calls.length, 0);
});

test('cancels a pending token read with the readiness signal and never fetches', async () => {
  const controller = new AbortController();
  const fetcher = vi.fn();
  let started!: () => void;
  const reading = new Promise<void>((resolve) => {
    started = resolve;
  });
  vi.mocked(readFile).mockImplementationOnce(async (_path, options) => {
    const signal =
      typeof options === 'object' && options !== null
        ? options.signal
        : undefined;
    started();
    assert.strictEqual(signal, controller.signal);
    return await new Promise<never>((_resolve, reject) => {
      signal!.addEventListener(
        'abort',
        () => reject(new DOMException('Aborted', 'AbortError')),
        { once: true },
      );
    });
  });
  const probe = createHttpBrokerReadinessProbe({
    baseUrl: 'http://broker.invalid',
    tokenFile: '/mocked-token',
    fetch: fetcher,
  });
  const pending = probe(controller.signal);
  const rejected = assert.rejects(pending, { name: 'AbortError' });
  await reading;
  controller.abort();
  await rejected;
  assert.strictEqual(fetcher.mock.calls.length, 0);
});

test('does not fetch when cancellation arrives just after the token read', async () => {
  const controller = new AbortController();
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ data: [] })));
  vi.mocked(readFile).mockImplementationOnce(async () => {
    controller.abort();
    return 'synthetic-token';
  });
  const probe = createHttpBrokerReadinessProbe({
    baseUrl: 'http://broker.invalid',
    tokenFile: '/mocked-token',
    fetch: fetcher,
  });
  await assert.rejects(() => probe(controller.signal), { name: 'AbortError' });
  assert.strictEqual(fetcher.mock.calls.length, 0);
});
