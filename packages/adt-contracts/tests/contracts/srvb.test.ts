/**
 * Service Binding (SRVB) contract scenarios
 *
 * Endpoint: /sap/bc/adt/businessservices/bindings
 * Content-Type: application/vnd.sap.adt.businessservices.servicebinding.v1+xml
 *
 * SRVB is metadata-only — unlike BDEF/SRVD there is no source text.
 * The contract adds publish/unpublish to the base CRUD surface.
 */

import { fixtures } from '@abapify/adt-fixtures';
import { servicebinding } from '../../src/schemas';
import { ContractScenario, runScenario, type ContractOperation } from './base';
import { bindingsContract } from '../../src/adt/businessservices/bindings';

class SrvbScenario extends ContractScenario {
  readonly name = 'Business Services Bindings (SRVB)';

  readonly operations: ContractOperation[] = [
    {
      name: 'get SRVB metadata',
      contract: () => bindingsContract.get('ZUI_MOCK_SRVB'),
      method: 'GET',
      path: '/sap/bc/adt/businessservices/bindings/zui_mock_srvb',
      headers: {
        Accept:
          'application/vnd.sap.adt.businessservices.servicebinding.v1+xml',
      },
      response: {
        status: 200,
        schema: servicebinding,
        fixture: fixtures.businessservices.bindings.single,
      },
    },
    {
      name: 'create SRVB',
      contract: () => bindingsContract.post(),
      method: 'POST',
      path: '/sap/bc/adt/businessservices/bindings',
      headers: {
        'Content-Type':
          'application/vnd.sap.adt.businessservices.servicebinding.v1+xml',
      },
      body: { schema: servicebinding },
      response: { status: 200, schema: servicebinding },
    },
    {
      name: 'delete SRVB',
      contract: () =>
        bindingsContract.delete('ZUI_MOCK_SRVB', { corrNr: 'DEVK900001' }),
      method: 'DELETE',
      path: '/sap/bc/adt/businessservices/bindings/zui_mock_srvb',
      query: { corrNr: 'DEVK900001' },
    },
    {
      name: 'lock SRVB',
      contract: () =>
        bindingsContract.lock('ZUI_MOCK_SRVB', { accessMode: 'MODIFY' }),
      method: 'POST',
      path: '/sap/bc/adt/businessservices/bindings/zui_mock_srvb',
      query: { _action: 'LOCK', accessMode: 'MODIFY' },
    },
    {
      name: 'publish SRVB',
      contract: () => bindingsContract.publish('ZUI_MOCK_SRVB'),
      method: 'POST',
      path: '/sap/bc/adt/businessservices/bindings/zui_mock_srvb/publishedstates',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
    {
      name: 'unpublish SRVB',
      contract: () => bindingsContract.unpublish('ZUI_MOCK_SRVB'),
      method: 'DELETE',
      path: '/sap/bc/adt/businessservices/bindings/zui_mock_srvb/publishedstates',
      headers: { Accept: 'application/json' },
    },
  ];
}

runScenario(new SrvbScenario());
