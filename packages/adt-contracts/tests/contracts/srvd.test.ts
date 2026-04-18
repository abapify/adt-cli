/**
 * RAP Service Definition (SRVD) contract scenarios
 *
 * Endpoint: /sap/bc/adt/ddic/srvd/sources
 * Content-Type: application/vnd.sap.adt.ddic.srvd.v1+xml
 */

import { fixtures } from '@abapify/adt-fixtures';
import { srvdSource } from '../../src/schemas';
import { ContractScenario, runScenario, type ContractOperation } from './base';
import { srvdSourcesContract } from '../../src/adt/ddic/srvd';

class SrvdScenario extends ContractScenario {
  readonly name = 'DDIC SRVD Sources';

  readonly operations: ContractOperation[] = [
    {
      name: 'get SRVD metadata',
      contract: () => srvdSourcesContract.get('ZUI_MOCK_SRVD'),
      method: 'GET',
      path: '/sap/bc/adt/ddic/srvd/sources/zui_mock_srvd',
      headers: {
        Accept: 'application/vnd.sap.adt.ddic.srvd.v1+xml',
      },
      response: {
        status: 200,
        schema: srvdSource,
        fixture: fixtures.ddic.srvd.single,
      },
    },
    {
      name: 'create SRVD',
      contract: () => srvdSourcesContract.post(),
      method: 'POST',
      path: '/sap/bc/adt/ddic/srvd/sources',
      headers: {
        'Content-Type': 'application/vnd.sap.adt.ddic.srvd.v1+xml',
      },
      body: { schema: srvdSource },
      response: { status: 200, schema: srvdSource },
    },
    {
      name: 'delete SRVD',
      contract: () =>
        srvdSourcesContract.delete('ZUI_MOCK_SRVD', {
          corrNr: 'DEVK900001',
        }),
      method: 'DELETE',
      path: '/sap/bc/adt/ddic/srvd/sources/zui_mock_srvd',
      query: { corrNr: 'DEVK900001' },
    },
    {
      name: 'get SRVD source (.asrvd)',
      contract: () => srvdSourcesContract.source.main.get('ZUI_MOCK_SRVD'),
      method: 'GET',
      path: '/sap/bc/adt/ddic/srvd/sources/zui_mock_srvd/source/main',
      headers: { Accept: 'text/plain' },
    },
    {
      name: 'put SRVD source (.asrvd) with lock handle',
      contract: () =>
        srvdSourcesContract.source.main.put('ZUI_MOCK_SRVD', {
          lockHandle: 'LH-ABC',
        }),
      method: 'PUT',
      path: '/sap/bc/adt/ddic/srvd/sources/zui_mock_srvd/source/main',
      headers: { 'Content-Type': 'text/plain' },
      query: { lockHandle: 'LH-ABC' },
    },
    {
      name: 'lock SRVD',
      contract: () =>
        srvdSourcesContract.lock('ZUI_MOCK_SRVD', {
          accessMode: 'MODIFY',
        }),
      method: 'POST',
      path: '/sap/bc/adt/ddic/srvd/sources/zui_mock_srvd',
      query: { _action: 'LOCK', accessMode: 'MODIFY' },
    },
  ];
}

runScenario(new SrvdScenario());
