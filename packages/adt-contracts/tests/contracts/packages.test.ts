/**
 * Packages Contract Scenarios
 *
 * Uses crud() helper — full CRUD with v2 content type.
 */

import { packagesV1 } from '../../src/schemas';
import { fixtures } from '@abapify/adt-fixtures';
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
      headers: { Accept: 'application/vnd.sap.adt.packages.v2+xml' },
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
      headers: { Accept: 'application/vnd.sap.adt.packages.v2+xml' },
      response: { status: 200, schema: packagesV1 },
    },
    {
      name: 'create package (POST)',
      contract: () => packagesContract.post({ corrNr: 'DEVK900001' }),
      method: 'POST',
      path: '/sap/bc/adt/packages',
      headers: {
        Accept: 'application/vnd.sap.adt.packages.v2+xml',
        'Content-Type': 'application/vnd.sap.adt.packages.v2+xml',
      },
      query: { corrNr: 'DEVK900001' },
      body: { schema: packagesV1 },
      response: { status: 200, schema: packagesV1 },
    },
    {
      name: 'delete package',
      contract: () =>
        packagesContract.delete('ZTEST_PKG', { corrNr: 'DEVK900001' }),
      method: 'DELETE',
      path: '/sap/bc/adt/packages/ZTEST_PKG',
      query: { corrNr: 'DEVK900001' },
    },
  ];
}

// Run scenario
runScenario(new PackagesScenario());
