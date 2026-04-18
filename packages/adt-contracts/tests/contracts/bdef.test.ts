/**
 * Behavior Definition (BDEF) contract scenarios
 *
 * Endpoint: /sap/bc/adt/bo/behaviordefinitions
 * Content-Type: application/vnd.sap.adt.blues.v1+xml
 */

import { fixtures } from '@abapify/adt-fixtures';
import { blueSource } from '../../src/schemas';
import { ContractScenario, runScenario, type ContractOperation } from './base';
import { behaviordefinitionsContract } from '../../src/adt/bo/behaviordefinitions';

class BdefScenario extends ContractScenario {
  readonly name = 'BO Behavior Definitions';

  readonly operations: ContractOperation[] = [
    {
      name: 'get BDEF metadata',
      contract: () => behaviordefinitionsContract.get('ZMOCK_BDEF'),
      method: 'GET',
      path: '/sap/bc/adt/bo/behaviordefinitions/zmock_bdef',
      headers: {
        Accept: 'application/vnd.sap.adt.blues.v1+xml',
      },
      response: {
        status: 200,
        schema: blueSource,
        fixture: fixtures.bo.bdef.single,
      },
    },
    {
      name: 'create BDEF',
      contract: () => behaviordefinitionsContract.post(),
      method: 'POST',
      path: '/sap/bc/adt/bo/behaviordefinitions',
      headers: {
        'Content-Type': 'application/vnd.sap.adt.blues.v1+xml',
      },
      body: { schema: blueSource },
      response: { status: 200, schema: blueSource },
    },
    {
      name: 'delete BDEF',
      contract: () =>
        behaviordefinitionsContract.delete('ZMOCK_BDEF', {
          corrNr: 'DEVK900001',
        }),
      method: 'DELETE',
      path: '/sap/bc/adt/bo/behaviordefinitions/zmock_bdef',
      query: { corrNr: 'DEVK900001' },
    },
    {
      name: 'get BDEF source (.abdl)',
      contract: () => behaviordefinitionsContract.source.main.get('ZMOCK_BDEF'),
      method: 'GET',
      path: '/sap/bc/adt/bo/behaviordefinitions/zmock_bdef/source/main',
      headers: { Accept: 'text/plain' },
    },
    {
      name: 'put BDEF source (.abdl) with lock handle',
      contract: () =>
        behaviordefinitionsContract.source.main.put('ZMOCK_BDEF', {
          lockHandle: 'LH-ABC',
        }),
      method: 'PUT',
      path: '/sap/bc/adt/bo/behaviordefinitions/zmock_bdef/source/main',
      headers: { 'Content-Type': 'text/plain' },
      query: { lockHandle: 'LH-ABC' },
    },
    {
      name: 'lock BDEF',
      contract: () =>
        behaviordefinitionsContract.lock('ZMOCK_BDEF', {
          accessMode: 'MODIFY',
        }),
      method: 'POST',
      path: '/sap/bc/adt/bo/behaviordefinitions/zmock_bdef',
      query: { _action: 'LOCK', accessMode: 'MODIFY' },
    },
  ];
}

runScenario(new BdefScenario());
