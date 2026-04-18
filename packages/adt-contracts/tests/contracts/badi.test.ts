/**
 * BAdI / Enhancement Implementation (ENHO/XHH) contract scenarios
 *
 * Endpoint: /sap/bc/adt/enhancements/enhoxhh
 * Content-Type: application/vnd.sap.adt.enhancements.enhoxhh.v1+xml
 */

import { fixtures } from '@abapify/adt-fixtures';
import { badi } from '../../src/schemas';
import { ContractScenario, runScenario, type ContractOperation } from './base';
import { enhoxhhContract } from '../../src/adt/enhancements/enhoxhh';

class BadiScenario extends ContractScenario {
  readonly name = 'BAdI / ENHO Enhancement Implementations';

  readonly operations: ContractOperation[] = [
    {
      name: 'get BAdI metadata',
      contract: () => enhoxhhContract.get('ZE_MOCK_BADI'),
      method: 'GET',
      path: '/sap/bc/adt/enhancements/enhoxhh/ze_mock_badi',
      headers: {
        Accept: 'application/vnd.sap.adt.enhancements.enhoxhh.v1+xml',
      },
      response: {
        status: 200,
        schema: badi,
        fixture: fixtures.enhancements.enhoxhh.single,
      },
    },
    {
      name: 'create BAdI',
      contract: () => enhoxhhContract.post(),
      method: 'POST',
      path: '/sap/bc/adt/enhancements/enhoxhh',
      headers: {
        'Content-Type': 'application/vnd.sap.adt.enhancements.enhoxhh.v1+xml',
      },
      body: { schema: badi },
      response: { status: 200, schema: badi },
    },
    {
      name: 'delete BAdI',
      contract: () =>
        enhoxhhContract.delete('ZE_MOCK_BADI', { corrNr: 'DEVK900001' }),
      method: 'DELETE',
      path: '/sap/bc/adt/enhancements/enhoxhh/ze_mock_badi',
      query: { corrNr: 'DEVK900001' },
    },
    {
      name: 'get BAdI source',
      contract: () => enhoxhhContract.source.main.get('ZE_MOCK_BADI'),
      method: 'GET',
      path: '/sap/bc/adt/enhancements/enhoxhh/ze_mock_badi/source/main',
      headers: { Accept: 'text/plain' },
    },
    {
      name: 'put BAdI source with lock handle',
      contract: () =>
        enhoxhhContract.source.main.put('ZE_MOCK_BADI', {
          lockHandle: 'LH-XYZ',
        }),
      method: 'PUT',
      path: '/sap/bc/adt/enhancements/enhoxhh/ze_mock_badi/source/main',
      headers: { 'Content-Type': 'text/plain' },
      query: { lockHandle: 'LH-XYZ' },
    },
    {
      name: 'lock BAdI',
      contract: () =>
        enhoxhhContract.lock('ZE_MOCK_BADI', { accessMode: 'MODIFY' }),
      method: 'POST',
      path: '/sap/bc/adt/enhancements/enhoxhh/ze_mock_badi',
      query: { _action: 'LOCK', accessMode: 'MODIFY' },
    },
  ];
}

runScenario(new BadiScenario());
