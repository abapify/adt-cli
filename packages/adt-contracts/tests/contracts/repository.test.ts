/**
 * Repository Information System Contract Scenarios
 */

import { fixtures } from 'adt-fixtures';
import { adtcore } from '../../src/schemas';
import { ContractScenario, runScenario, type ContractOperation } from './base';
import { searchContract } from '../../src/adt/repository/informationsystem/search';

class SearchScenario extends ContractScenario {
  readonly name = 'Repository Information System - Search';

  readonly operations: ContractOperation[] = [
    {
      name: 'quick search with defaults',
      contract: () => searchContract.quickSearch({ query: 'zcl*' }),
      method: 'GET',
      path: '/sap/bc/adt/repository/informationsystem/search',
      query: {
        operation: 'quickSearch',
        query: 'zcl*',
        maxResults: 50,
      },
      response: {
        status: 200,
        schema: adtcore,
        fixture: fixtures.repository.search.quickSearch,
      },
    },
    {
      name: 'quick search with custom maxResults',
      contract: () =>
        searchContract.quickSearch({ query: 'ztest', maxResults: 10 }),
      method: 'GET',
      path: '/sap/bc/adt/repository/informationsystem/search',
      query: {
        operation: 'quickSearch',
        query: 'ztest',
        maxResults: 10,
      },
      response: {
        status: 200,
        schema: adtcore,
      },
    },
    {
      name: 'quick search with wildcard',
      contract: () =>
        searchContract.quickSearch({ query: '*test*', maxResults: 100 }),
      method: 'GET',
      path: '/sap/bc/adt/repository/informationsystem/search',
      query: {
        operation: 'quickSearch',
        query: '*test*',
        maxResults: 100,
      },
      response: {
        status: 200,
        schema: adtcore,
      },
    },
  ];
}

// Run scenario
runScenario(new SearchScenario());
