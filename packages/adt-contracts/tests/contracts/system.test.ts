/**
 * System Users Contract Scenarios
 */

import { fixtures } from '@abapify/adt-fixtures';
import { atomFeed } from '../../src/schemas';
import { ContractScenario, runScenario, type ContractOperation } from './base';
import { usersContract } from '../../src/adt/system/users';

class UsersScenario extends ContractScenario {
  readonly name = 'System Users';

  readonly operations: ContractOperation[] = [
    {
      name: 'search users',
      contract: () =>
        usersContract.search({ querystring: 'DEV*', maxcount: 10 }),
      method: 'GET',
      path: '/sap/bc/adt/system/users',
      query: { querystring: 'DEV*', maxcount: 10 },
      headers: {
        Accept: 'application/atom+xml;type=feed',
      },
      response: {
        status: 200,
        schema: atomFeed,
        fixture: fixtures.system.users.search,
      },
    },
    {
      name: 'get single user',
      contract: () => usersContract.get('DEVELOPER'),
      method: 'GET',
      path: '/sap/bc/adt/system/users/DEVELOPER',
      headers: {
        Accept: 'application/atom+xml;type=feed',
      },
      response: {
        status: 200,
        schema: atomFeed,
        fixture: fixtures.system.users.single,
      },
    },
  ];
}

runScenario(new UsersScenario());
