/**
 * Unit tests for `ChangesetService` — exercises begin/add/commit/rollback
 * against the in-process mock ADT backend (from `@abapify/adt-fixtures`).
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { createAdtClient, type AdtClient } from '@abapify/adt-client';
import { createMockAdtServer, type MockAdtServer } from '@abapify/adt-fixtures';
import { ChangesetService } from '../../../src/lib/services/changeset';

describe('ChangesetService', () => {
  let mock: MockAdtServer;
  let client: AdtClient;

  beforeAll(async () => {
    mock = createMockAdtServer();
    const info = await mock.start();
    client = createAdtClient({
      baseUrl: `http://127.0.0.1:${info.port}`,
      username: 'TEST',
      password: 'secret',
      client: '100',
    });
  });

  afterAll(async () => {
    await mock?.stop();
  });

  it('begin → add → commit activates and releases locks', async () => {
    const svc = new ChangesetService(client);
    const cs = svc.begin('unit-test');
    expect(cs.status).toBe('open');
    expect(cs.id).toBeTruthy();

    await svc.add(cs, {
      objectUri: '/sap/bc/adt/oo/classes/zcl_unit_a',
      objectType: 'CLAS',
      objectName: 'ZCL_UNIT_A',
      source: 'CLASS x DEFINITION. ENDCLASS. CLASS x IMPLEMENTATION. ENDCLASS.',
    });
    await svc.add(cs, {
      objectUri: '/sap/bc/adt/programs/programs/zunit_b',
      objectType: 'PROG',
      objectName: 'ZUNIT_B',
      source: 'REPORT zunit_b.',
    });
    expect(cs.entries).toHaveLength(2);
    for (const entry of cs.entries) {
      expect(entry.lockHandle).toBeTruthy();
    }

    const result = await svc.commit(cs);
    expect(cs.status).toBe('committed');
    expect(result.activated).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
  });

  it('begin → add → rollback releases locks without activating', async () => {
    const svc = new ChangesetService(client);
    const cs = svc.begin();
    await svc.add(cs, {
      objectUri: '/sap/bc/adt/oo/interfaces/zif_unit',
      objectType: 'INTF',
      objectName: 'ZIF_UNIT',
      source: 'INTERFACE zif_unit PUBLIC. ENDINTERFACE.',
    });

    const result = await svc.rollback(cs);
    expect(cs.status).toBe('rolled_back');
    expect(result.released).toHaveLength(1);
    expect(result.failed).toHaveLength(0);
  });

  it('add on a non-open changeset throws', async () => {
    const svc = new ChangesetService(client);
    const cs = svc.begin();
    await svc.rollback(cs);
    await expect(
      svc.add(cs, {
        objectUri: '/sap/bc/adt/programs/programs/zrejected',
        objectType: 'PROG',
        objectName: 'ZREJECTED',
        source: 'REPORT zrejected.',
      }),
    ).rejects.toThrow(/not open/u);
  });
});
