import { describe, it, expect } from 'vitest';
import { fixtures } from '@abapify/adt-fixtures';
import { blueSource, ddlxSource, dtebSource } from '../../src/schemas';
import { ContractScenario, runScenario, type ContractOperation } from './base';
import { ddlxSourcesContract } from '../../src/adt/ddic/ddlx';
import { dsfdSourcesContract } from '../../src/adt/ddic/dsfd';
import { dsfiContract, dsfiDefinitionSchema } from '../../src/adt/ddic/dsfi';
import { dtebSourcesContract } from '../../src/adt/ddic/dteb';

class CdsRapSourcesScenario extends ContractScenario {
  readonly name = 'CDS/RAP source contracts';

  readonly operations: ContractOperation[] = [
    {
      name: 'get DDLX metadata',
      contract: () => ddlxSourcesContract.get('Z_AFF_DDLX'),
      method: 'GET',
      path: '/sap/bc/adt/ddic/ddlx/sources/z_aff_ddlx',
      headers: { Accept: 'application/vnd.sap.adt.ddic.ddlx.v1+xml' },
      response: {
        status: 200,
        schema: ddlxSource,
        fixture: fixtures.ddic.ddlx.single,
      },
    },
    {
      name: 'get DSFD metadata',
      contract: () => dsfdSourcesContract.get('Z_AFF_DSFD'),
      method: 'GET',
      path: '/sap/bc/adt/ddic/dsfd/sources/z_aff_dsfd',
      headers: { Accept: 'application/vnd.sap.adt.blues.v1+xml' },
      response: {
        status: 200,
        schema: blueSource,
        fixture: fixtures.ddic.dsfd.single,
      },
    },
    {
      name: 'get DSFI AFF JSON source',
      contract: () => dsfiContract.source.main.get('Z_AFF_DSFI'),
      method: 'GET',
      path: '/sap/bc/adt/ddic/dsfi/z_aff_dsfi/source/main',
      headers: { Accept: 'application/json' },
      response: {
        status: 200,
        schema: dsfiDefinitionSchema,
        fixture: fixtures.ddic.dsfi.source,
      },
    },
    {
      name: 'get DTEB metadata',
      contract: () => dtebSourcesContract.get('Z_AFF_DTEB'),
      method: 'GET',
      path: '/sap/bc/adt/ddic/dteb/sources/z_aff_dteb',
      headers: { Accept: 'application/vnd.sap.adt.ddic.dteb.v1+xml' },
      response: {
        status: 200,
        schema: dtebSource,
        fixture: fixtures.ddic.dteb.single,
      },
    },
  ];
}

describe('CDS/RAP source contracts', () => {
  it('defines at least one contract operation', () => {
    const scenario = new CdsRapSourcesScenario();
    expect(scenario.operations.length).toBeGreaterThan(0);
  });

  runScenario(new CdsRapSourcesScenario());
});
