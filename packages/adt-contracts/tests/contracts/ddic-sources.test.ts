/**
 * DDIC DDL / DCL source contract scenarios
 */

import { fixtures } from '@abapify/adt-fixtures';
import { ddlSource, dclSource } from '../../src/schemas';
import { ContractScenario, runScenario, type ContractOperation } from './base';
import { ddlSourcesContract } from '../../src/adt/ddic/ddl';
import { dclSourcesContract } from '../../src/adt/ddic/dcl';

class DdlSourcesScenario extends ContractScenario {
  readonly name = 'DDIC DDL Sources';

  readonly operations: ContractOperation[] = [
    {
      name: 'get DDL source metadata',
      contract: () => ddlSourcesContract.get('ZDDL_SAMPLE'),
      method: 'GET',
      path: '/sap/bc/adt/ddic/ddl/sources/zddl_sample',
      headers: {
        Accept:
          'application/vnd.sap.adt.ddl.source.v2+xml, application/vnd.sap.adt.ddl.source.v1+xml',
      },
      response: {
        status: 200,
        schema: ddlSource,
        fixture: fixtures.ddic.ddl.source,
      },
    },
    {
      name: 'create DDL source',
      contract: () => ddlSourcesContract.post(),
      method: 'POST',
      path: '/sap/bc/adt/ddic/ddl/sources',
      headers: {
        'Content-Type': 'application/vnd.sap.adt.ddl.source.v2+xml',
      },
      body: { schema: ddlSource },
      response: { status: 200, schema: ddlSource },
    },
    {
      name: 'get DDL source text (main include)',
      contract: () => ddlSourcesContract.source.main.get('ZDDL_SAMPLE'),
      method: 'GET',
      path: '/sap/bc/adt/ddic/ddl/sources/zddl_sample/source/main',
      headers: { Accept: 'text/plain' },
    },
    {
      name: 'put DDL source text (main include) with lock handle',
      contract: () =>
        ddlSourcesContract.source.main.put('ZDDL_SAMPLE', {
          lockHandle: 'ABC',
        }),
      method: 'PUT',
      path: '/sap/bc/adt/ddic/ddl/sources/zddl_sample/source/main',
      headers: { 'Content-Type': 'text/plain' },
      query: { lockHandle: 'ABC' },
    },
  ];
}

class DclSourcesScenario extends ContractScenario {
  readonly name = 'DDIC DCL Sources';

  readonly operations: ContractOperation[] = [
    {
      name: 'get DCL source metadata',
      contract: () => dclSourcesContract.get('ZDCL_SAMPLE'),
      method: 'GET',
      path: '/sap/bc/adt/acm/dcl/sources/zdcl_sample',
      headers: {
        Accept: 'application/vnd.sap.adt.acm.dcl.source.v1+xml',
      },
      response: {
        status: 200,
        schema: dclSource,
        fixture: fixtures.ddic.dcl.source,
      },
    },
    {
      name: 'create DCL source',
      contract: () => dclSourcesContract.post(),
      method: 'POST',
      path: '/sap/bc/adt/acm/dcl/sources',
      headers: {
        'Content-Type': 'application/vnd.sap.adt.acm.dcl.source.v1+xml',
      },
      body: { schema: dclSource },
      response: { status: 200, schema: dclSource },
    },
    {
      name: 'get DCL source text (main include)',
      contract: () => dclSourcesContract.source.main.get('ZDCL_SAMPLE'),
      method: 'GET',
      path: '/sap/bc/adt/acm/dcl/sources/zdcl_sample/source/main',
      headers: { Accept: 'text/plain' },
    },
  ];
}

runScenario(new DdlSourcesScenario());
runScenario(new DclSourcesScenario());
