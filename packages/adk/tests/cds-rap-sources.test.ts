import { describe, expect, it, vi } from 'vitest';
import type { AdkContext } from '../src/base/context';
import { AdkGenericObject, createAdkFactory } from '../src/factory';
import '../src/index';
import { AdkCdsAspect } from '../src/objects/cds/dras.model';
import { AdkCdsType } from '../src/objects/cds/drty.model';
import { AdkScalarFunctionDefinition } from '../src/objects/cds/dsfd.model';
import { AdkScalarFunctionImplementation } from '../src/objects/cds/dsfi.model';
import { AdkEntityBuffer } from '../src/objects/cds/dteb.model';
import { AdkDdlExtension } from '../src/objects/cds/ddlx.model';
import { AdkDynamicCache } from '../src/objects/cds/dtdc.model';
import { AdkTuningIndex } from '../src/objects/cds/dtix.model';
import { AdkStaticCache } from '../src/objects/cds/dtsc.model';
import { AdkExternalSchema } from '../src/objects/cds/desd.model';

function sourceContract(
  source: unknown = 'define view entity Z_AFF as select from I_Any',
) {
  return {
    get: vi
      .fn()
      .mockResolvedValue({ blueSource: { description: 'Sanitized fixture' } }),
    source: { main: { get: vi.fn().mockResolvedValue(source) } },
  };
}

function createCtx() {
  const ddlx = { sources: sourceContract() };
  const dsfd = { sources: sourceContract() };
  const dteb = { sources: sourceContract() };
  const dsfi = sourceContract({
    formatVersion: '1',
    header: { description: 'Sanitized fixture', originalLanguage: 'en' },
    scalarFunctionName: 'Z_AFF_DSFD',
    engine: 'analyticalEngine',
  });
  const readTextBounded = vi.fn().mockResolvedValue('define type Z_AFF_TYPE');
  const ctx = {
    client: {
      adt: { ddic: { ddlx, dsfd, dsfi, dteb } },
      readTextBounded,
    },
  } as unknown as AdkContext;
  return { ctx, ddlx, dsfd, dsfi, dteb, readTextBounded };
}

describe('CDS/RAP source object loaders', () => {
  it.each([
    'BDEF',
    'DCLS',
    'DDLS',
    'DDLX',
    'DESD',
    'DRAS',
    'DRTY',
    'DSFD',
    'DSFI',
    'DTDC',
    'DTEB',
    'DTIX',
    'DTSC',
    'SRVD',
    'SRVB',
  ])('resolves %s through the public ADK factory', (objectType) => {
    const object = createAdkFactory(createCtx().ctx).get(
      'Z_AFF_OBJECT',
      objectType,
    );
    expect(object).not.toBeInstanceOf(AdkGenericObject);
  });

  it.each([
    ['DDLX', AdkDdlExtension, 'ddlx'],
    ['DSFD', AdkScalarFunctionDefinition, 'dsfd'],
    ['DTEB', AdkEntityBuffer, 'dteb'],
  ] as const)(
    'loads %s metadata and source/main',
    async (_type, Constructor, key) => {
      const setup = createCtx();
      const object = new Constructor(setup.ctx, 'Z_AFF_OBJECT');
      await object.load();
      expect(setup[key].sources.get).toHaveBeenCalledWith('Z_AFF_OBJECT');
      expect(setup[key].sources.source.main.get).toHaveBeenCalledWith(
        'Z_AFF_OBJECT',
      );
    },
  );

  it('loads DSFI JSON from source/main without inventing source text', async () => {
    const setup = createCtx();
    const object = new AdkScalarFunctionImplementation(setup.ctx, 'Z_AFF_DSFI');
    await object.load();
    await expect(object.getSource()).resolves.toMatchObject({
      scalarFunctionName: 'Z_AFF_DSFD',
      engine: 'analyticalEngine',
    });
    expect(setup.dsfi.get).toHaveBeenCalledWith('Z_AFF_DSFI');
    expect(setup.dsfi.source.main.get).toHaveBeenCalledWith('Z_AFF_DSFI');
  });

  it.each([
    ['DRAS', AdkCdsAspect, 'ddic/dras/sources'],
    ['DRTY', AdkCdsType, 'ddic/drty/sources'],
    ['DTDC', AdkDynamicCache, 'ddic/dtdc/sources'],
    ['DTIX', AdkTuningIndex, 'ddic/dtix/sources'],
    ['DTSC', AdkStaticCache, 'ddic/dtsc/sources'],
  ] as const)(
    'loads %s through its source/main endpoint',
    async (_type, Constructor, endpoint) => {
      const setup = createCtx();
      const object = new Constructor(setup.ctx, 'Z_AFF_OBJECT');
      await expect(object.load()).resolves.toBe(object);
      expect(setup.readTextBounded).toHaveBeenCalledWith(
        `/sap/bc/adt/${endpoint}/z_aff_object/source/main`,
        5 * 1024 * 1024,
        { headers: { Accept: 'text/plain' } },
      );
    },
  );

  it('loads DESD metadata before materializing its JSON-only AFF layout', async () => {
    const setup = createCtx();
    const object = new AdkExternalSchema(setup.ctx, 'Z_AFF_DESD');
    await expect(object.load()).resolves.toBe(object);
    expect(setup.readTextBounded).toHaveBeenCalledWith(
      '/sap/bc/adt/ddic/desd/z_aff_desd',
      5 * 1024 * 1024,
      { headers: { Accept: 'application/xml' } },
    );
  });
});
