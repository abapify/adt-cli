/**
 * CTS (Change and Transport System) Contract Scenarios
 *
 * NOTE: CTS contracts use plain objects with methods (not wrapped with contract()),
 * so client call tests are not applicable here. The contract definition tests
 * verify the structure is correct.
 */

import { fixtures } from 'adt-fixtures';
import {
  transportmanagmentSingle,
  transportmanagmentCreate,
  transportfind,
  transportmanagment,
} from '../../src/schemas';
import { ContractScenario, runScenario, type ContractOperation } from './base';
import { transports, TransportFunction } from '../../src/adt/cts/transports';
import { transportrequests } from '../../src/adt/cts/transportrequests';

class TransportsScenario extends ContractScenario {
  readonly name = 'CTS Transports';

  readonly operations: ContractOperation[] = [
    {
      name: 'find transports',
      contract: () =>
        transports.find({
          _action: 'FIND',
          user: '*',
          trfunction: TransportFunction.ALL,
        }),
      method: 'GET',
      path: '/sap/bc/adt/cts/transports',
      headers: { Accept: '*/*' },
      query: { _action: 'FIND', user: '*', trfunction: '*' },
      response: {
        status: 200,
        schema: transportfind,
      },
    },
    {
      name: 'find workbench requests for user',
      contract: () =>
        transports.find({
          _action: 'FIND',
          user: 'DEVELOPER',
          trfunction: TransportFunction.WORKBENCH,
        }),
      method: 'GET',
      path: '/sap/bc/adt/cts/transports',
      query: { _action: 'FIND', user: 'DEVELOPER', trfunction: 'K' },
      response: { status: 200, schema: transportfind },
    },
  ];
}

class TransportRequestsScenario extends ContractScenario {
  readonly name = 'CTS Transport Requests';

  readonly operations: ContractOperation[] = [
    {
      name: 'list all transports',
      contract: () => transportrequests.list(),
      method: 'GET',
      path: '/sap/bc/adt/cts/transportrequests',
      headers: { Accept: '*/*' },
      response: { status: 200, schema: transportmanagment },
    },
    {
      name: 'list with target filter',
      contract: () => transportrequests.list({ targets: 'PRD' }),
      method: 'GET',
      path: '/sap/bc/adt/cts/transportrequests',
      query: { targets: 'PRD' },
      response: { status: 200, schema: transportmanagment },
    },
    {
      name: 'get single transport',
      contract: () => transportrequests.get('DEVK900001'),
      method: 'GET',
      path: '/sap/bc/adt/cts/transportrequests/DEVK900001',
      headers: { Accept: 'application/vnd.sap.adt.transportorganizer.v1+xml' },
      response: {
        status: 200,
        schema: transportmanagmentSingle,
        fixture: fixtures.transport.single,
      },
    },
    {
      name: 'create transport',
      contract: () => transportrequests.create(),
      method: 'POST',
      path: '/sap/bc/adt/cts/transportrequests',
      headers: {
        Accept: 'application/vnd.sap.adt.transportorganizer.v1+xml',
        'Content-Type': 'application/xml',
      },
      body: {
        schema: transportmanagmentCreate,
        fixture: fixtures.transport.create,
      },
      response: { status: 200, schema: transportmanagmentSingle },
    },
    {
      name: 'update transport',
      contract: () => transportrequests.put('DEVK900001'),
      method: 'PUT',
      path: '/sap/bc/adt/cts/transportrequests/DEVK900001',
      headers: {
        Accept: 'application/vnd.sap.adt.transportorganizer.v1+xml',
        'Content-Type': 'application/xml',
      },
      body: { schema: transportmanagment },
      response: { status: 200, schema: transportmanagment },
    },
    {
      name: 'release transport (POST action)',
      contract: () => transportrequests.post('DEVK900001'),
      method: 'POST',
      path: '/sap/bc/adt/cts/transportrequests/DEVK900001',
      headers: {
        Accept: 'application/vnd.sap.adt.transportorganizer.v1+xml',
        'Content-Type': 'application/xml',
      },
      body: { schema: transportmanagment },
      response: { status: 200, schema: transportmanagment },
    },
    {
      name: 'delete transport',
      contract: () => transportrequests.delete('DEVK900001'),
      method: 'DELETE',
      path: '/sap/bc/adt/cts/transportrequests/DEVK900001',
      response: { status: 204, schema: undefined },
    },
  ];
}

// Run scenarios
runScenario(new TransportsScenario());
runScenario(new TransportRequestsScenario());
