/**
 * Packages Contract Scenarios
 */

import { packagesV1 } from '../../src/schemas';
import { fixtures } from 'adt-fixtures';
import { ContractScenario, runScenario, type ContractOperation } from './base';
import { packagesContract } from '../../src/adt/packages';

class PackagesScenario extends ContractScenario {
  readonly name = 'Packages';

  readonly operations: ContractOperation[] = [
    {
      name: 'get package by name',
      contract: () => packagesContract.get('$TMP'),
      method: 'GET',
      path: '/sap/bc/adt/packages/%24TMP', // $ is URL-encoded
      headers: { Accept: 'application/vnd.sap.adt.packages.v1+xml' },
      response: {
        status: 200,
        schema: packagesV1,
        fixture: fixtures.packages.tmp,
      },
    },
    {
      name: 'get package with special chars',
      contract: () => packagesContract.get('Z_MY_PACKAGE'),
      method: 'GET',
      path: '/sap/bc/adt/packages/Z_MY_PACKAGE',
      headers: { Accept: 'application/vnd.sap.adt.packages.v1+xml' },
      response: { status: 200, schema: packagesV1 },
    },
  ];
}

// Run scenario
runScenario(new PackagesScenario());
