/**
 * CTS transportrequests user-action contract scenarios
 *
 * Validates the release / reassign / create endpoints that ADT exposes
 * as POST bodies with `<tm:root tm:useraction="..."/>`.
 */

import { fixtures } from '@abapify/adt-fixtures';
import {
  transportUseraction,
  transportmanagmentSingle,
} from '../../src/schemas';
import { ContractScenario, runScenario, type ContractOperation } from './base';
import { useraction } from '../../src/adt/cts/transportrequests/useraction';

const CONTENT_TYPE = 'application/vnd.sap.adt.transportorganizer.v1+xml';

class TransportUseractionScenario extends ContractScenario {
  readonly name = 'CTS Transport Requests – User Action';

  readonly operations: ContractOperation[] = [
    {
      name: 'release transport',
      contract: () => useraction.release('DEVK900001'),
      method: 'POST',
      path: '/sap/bc/adt/cts/transportrequests/DEVK900001',
      headers: {
        Accept: CONTENT_TYPE,
        'Content-Type': CONTENT_TYPE,
      },
      body: {
        schema: transportUseraction,
        fixture: fixtures.transport.useractionRelease,
      },
      response: { status: 200, schema: transportmanagmentSingle },
    },
    {
      name: 'reassign transport (changeowner)',
      contract: () =>
        useraction.reassign('DEVK900001', { targetUser: 'NEWOWNER' }),
      method: 'POST',
      path: '/sap/bc/adt/cts/transportrequests/DEVK900001',
      headers: {
        Accept: CONTENT_TYPE,
        'Content-Type': CONTENT_TYPE,
      },
      body: {
        schema: transportUseraction,
        fixture: fixtures.transport.useractionChangeowner,
      },
      response: { status: 200, schema: transportmanagmentSingle },
    },
    {
      name: 'create transport (newrequest)',
      contract: () =>
        useraction.create({
          description: 'Sample request',
          type: 'K',
          target: 'LOCAL',
          owner: 'TESTUSER',
        }),
      method: 'POST',
      path: '/sap/bc/adt/cts/transportrequests',
      headers: {
        Accept: CONTENT_TYPE,
        'Content-Type': CONTENT_TYPE,
      },
      body: {
        schema: transportUseraction,
        fixture: fixtures.transport.useractionNewrequest,
      },
      response: { status: 200, schema: transportmanagmentSingle },
    },
  ];
}

runScenario(new TransportUseractionScenario());
