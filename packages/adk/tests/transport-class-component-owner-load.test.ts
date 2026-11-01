import { beforeEach, describe, expect, it, vi } from 'vitest';

const factoryGet = vi.hoisted(() => vi.fn());

vi.mock('../src/factory', () => ({
  createAdk: vi.fn(() => ({ get: factoryGet })),
}));

vi.mock('../src/base/global-context', () => ({
  getGlobalContext: vi.fn(),
}));

import { AdkTransportObjectRef } from '../src/objects/cts/transport-import';

describe('AdkTransportObjectRef class-component loading', () => {
  beforeEach(() => {
    factoryGet.mockReset();
    factoryGet.mockReturnValue({ load: vi.fn(async () => undefined) });
  });

  it.each([
    {
      type: 'CPRI',
      wbtype: 'CLAS/OSI',
      name: 'ZCL_VIM_DI3_UTILS',
      owner: 'ZCL_VIM_DI3_UTILS',
    },
    {
      type: 'CINC',
      wbtype: 'CLAS/OCN',
      name: `${'ZCL_VIM_DI3_UTILS'.padEnd(30)}CCIMP`,
      owner: 'ZCL_VIM_DI3_UTILS',
    },
    {
      type: 'CINC',
      wbtype: 'CLAS/OCN',
      name: 'ZCL_VIM_DI3_WF_BO=============CCIMP',
      owner: 'ZCL_VIM_DI3_WF_BO',
    },
    {
      type: 'CINC',
      wbtype: 'CLAS/OCN',
      name: `${'Z'.repeat(30)}CCIMP`,
      owner: 'Z'.repeat(30),
    },
  ])(
    'loads URI-less $type/$wbtype through the canonical CLAS owner',
    async ({ type, wbtype, name, owner }) => {
      const object = new AdkTransportObjectRef({} as any, {
        pgmid: 'LIMU',
        type,
        wbtype,
        name,
      });

      await object.load();

      expect(factoryGet).toHaveBeenCalledWith(owner, 'CLAS');
      expect(factoryGet.mock.results[0]?.value.load).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    {
      pgmid: 'LIMU',
      type: 'CPRI',
      wbtype: 'CLAS/OSI',
      name: 'ZCL_VIM_DI3_UTILS',
      owner: 'ZCL_VIM_DI3_UTILS',
    },
    {
      pgmid: 'LIMU',
      type: 'CINC',
      wbtype: 'CLAS/OCN',
      name: `${'ZCL_VIM_DI3_UTILS'.padEnd(30)}CCIMP`,
      owner: 'ZCL_VIM_DI3_UTILS',
    },
    {
      pgmid: 'R3TR',
      type: 'CLAS',
      wbtype: 'CLAS',
      name: 'ZCL_VIM_DI3_UTILS',
      owner: 'ZCL_VIM_DI3_UTILS',
    },
  ])(
    'propagates HTTP 503 when loading $pgmid/$type through its CLAS owner',
    async ({ pgmid, type, wbtype, name, owner }) => {
      const error = Object.assign(new Error('HTTP 503: Service Unavailable'), {
        status: 503,
      });
      const load = vi.fn().mockRejectedValue(error);
      factoryGet.mockReturnValue({ load });
      const object = new AdkTransportObjectRef({} as any, {
        pgmid,
        type,
        wbtype,
        name,
      });

      await expect(object.load()).rejects.toBe(error);

      expect(factoryGet).toHaveBeenCalledWith(owner, 'CLAS');
      expect(load).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    { label: 'direct', details: { status: 404 } },
    { label: 'wrapped', details: { response: { status: 404 } } },
  ])(
    'returns undefined for a $label confirmed class-owner 404',
    async ({ details }) => {
      const error = Object.assign(new Error('HTTP 404: Not Found'), {
        ...details,
      });
      factoryGet.mockReturnValue({ load: vi.fn().mockRejectedValue(error) });
      const object = new AdkTransportObjectRef({} as any, {
        pgmid: 'LIMU',
        type: 'CINC',
        wbtype: 'CLAS/OCN',
        name: `${'ZCL_VIM_DI3_UTILS'.padEnd(30)}CCIMP`,
      });

      await expect(object.load()).resolves.toBeUndefined();
    },
  );

  it.each([
    { label: 'wrapped 503', details: { response: { status: 503 } } },
    {
      label: 'conflicting status',
      details: { status: 503, response: { status: 404 } },
    },
  ])(
    'propagates $label instead of treating it as absence',
    async ({ details }) => {
      const error = Object.assign(new Error('service unavailable'), details);
      factoryGet.mockReturnValue({ load: vi.fn().mockRejectedValue(error) });
      const object = new AdkTransportObjectRef({} as any, {
        pgmid: 'LIMU',
        type: 'CINC',
        wbtype: 'CLAS/OCN',
        name: 'ZCL_VIM_DI3_WF_BO=============CCIMP',
      });
      await expect(object.load()).rejects.toBe(error);
    },
  );

  it('returns generic objects unchanged for unsupported types without a load method', async () => {
    const genericObject = { name: 'ZUNKNOWN', type: 'ZUNKNOWN' };
    factoryGet.mockReturnValue(genericObject);
    const object = new AdkTransportObjectRef({} as any, {
      pgmid: 'R3TR',
      type: 'ZUNKNOWN',
      name: 'ZUNKNOWN',
    });

    await expect(object.load()).resolves.toBe(genericObject);
    expect(factoryGet).toHaveBeenCalledWith('ZUNKNOWN', 'ZUNKNOWN');
  });
});
