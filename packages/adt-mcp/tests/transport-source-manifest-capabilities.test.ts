import assert from 'node:assert/strict';
import test from 'node:test';
import { toMcpTransportSourceManifest } from '../src/lib/tools/cts-transport-source-manifest.js';
import { createSourceCapabilityRegistry } from '../src/lib/source-capabilities.js';

test('a transport source manifest replaces every immutable source URI with a capability', () => {
  const registry = createSourceCapabilityRegistry({
    now: () => 1_000,
    ttlMs: 60_000,
  });
  const response = toMcpTransportSourceManifest(
    {
      requestedTransports: ['DEVK900001'],
      scopeTransports: ['DEVK900001'],
      inventory: [
        {
          pgmid: 'LIMU',
          type: 'METH',
          name: 'ZCL_SAFE RUN',
          wbtype: 'CLAS',
          uri: '/sap/bc/adt/oo/classes/zcl_safe',
          objFunc: '',
          sourceTransport: 'DEVK900001',
        },
      ],
      entries: [
        {
          canonicalKey: 'CLAS:ZCL_SAFE',
          component: {
            id: 'main',
            sourceUri: '/sap/bc/adt/oo/classes/zcl_safe/source/main',
            versionsUri: '/sap/bc/adt/oo/classes/zcl_safe/source/main/versions',
          },
          base: {
            id: 'version-1',
            ordinal: 1,
            sourceUri: '/sap/bc/adt/oo/classes/zcl_safe/source/main/versions/1',
            transports: ['DEVK900001'],
          },
          head: {
            id: 'version-2',
            ordinal: 0,
            sourceUri: '/sap/bc/adt/oo/classes/zcl_safe/source/main/versions/2',
            transports: ['DEVK900001'],
          },
        },
      ],
    } as never,
    registry,
    { sessionId: 'session-a', destination: 'dev' },
  );

  const encoded = JSON.stringify(response);
  assert.ok(!encoded.includes('/sap/bc/adt/'));
  assert.deepEqual(response.inventory, [
    {
      pgmid: 'LIMU',
      type: 'METH',
      name: 'ZCL_SAFE RUN',
      wbtype: 'CLAS',
      objFunc: '',
      sourceTransport: 'DEVK900001',
    },
  ]);
  const entry = response.entries[0]!;
  assert.match(entry.base!.sourceCapability, /^src_/u);
  assert.match(entry.head!.sourceCapability, /^src_/u);
  assert.deepEqual(
    registry.resolve({
      sourceCapability: entry.head!.sourceCapability,
      sessionId: 'session-a',
      destination: 'dev',
    }),
    {
      sourceUri: '/sap/bc/adt/oo/classes/zcl_safe/source/main/versions/2',
    },
  );
});
