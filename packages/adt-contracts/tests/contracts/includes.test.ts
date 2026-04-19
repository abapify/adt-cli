/**
 * Includes Contract Scenarios
 *
 * Program Includes (PROG/I) CRUD operations on
 * `/sap/bc/adt/programs/includes`.
 */

import { includes as includesSchema } from '../../src/schemas';
import { ContractScenario, runScenario, type ContractOperation } from './base';
import {
  programsModuleContract as programsContract,
  includesContract,
} from '../../src/adt/programs';
import { fixtures } from '@abapify/adt-fixtures';

const ACCEPT =
  'application/vnd.sap.adt.programs.includes.v2+xml, application/vnd.sap.adt.programs.includes.v1+xml, application/vnd.sap.adt.programs.includes+xml';
const CONTENT_TYPE = 'application/vnd.sap.adt.programs.includes.v2+xml';

class IncludesScenario extends ContractScenario {
  readonly name = 'Program Includes';

  readonly operations: ContractOperation[] = [
    {
      name: 'get include metadata',
      contract: () => includesContract.get('ZTEST_INCLUDE'),
      method: 'GET',
      path: '/sap/bc/adt/programs/includes/ztest_include',
      headers: { Accept: ACCEPT },
      response: {
        status: 200,
        schema: includesSchema,
        fixture: fixtures.programs.include,
      },
    },
    {
      name: 'create include',
      contract: () => includesContract.post(),
      method: 'POST',
      path: '/sap/bc/adt/programs/includes',
      headers: { Accept: ACCEPT, 'Content-Type': CONTENT_TYPE },
      body: { schema: includesSchema },
      response: { status: 200, schema: includesSchema },
    },
    {
      name: 'update include',
      contract: () => includesContract.put('ZTEST_INCLUDE'),
      method: 'PUT',
      path: '/sap/bc/adt/programs/includes/ztest_include',
      headers: { Accept: ACCEPT, 'Content-Type': CONTENT_TYPE },
      body: { schema: includesSchema },
      response: { status: 200, schema: includesSchema },
    },
    {
      name: 'delete include',
      contract: () => includesContract.delete('ZTEST_INCLUDE'),
      method: 'DELETE',
      path: '/sap/bc/adt/programs/includes/ztest_include',
      response: { status: 204, schema: undefined },
    },
  ];
}

class IncludeSourceScenario extends ContractScenario {
  readonly name = 'Program Include Source';

  readonly operations: ContractOperation[] = [
    {
      name: 'get main source',
      contract: () => includesContract.source.main.get('ZTEST_INCLUDE'),
      method: 'GET',
      path: '/sap/bc/adt/programs/includes/ztest_include/source/main',
      headers: { Accept: 'text/plain' },
    },
    {
      name: 'update main source',
      contract: () => includesContract.source.main.put('ZTEST_INCLUDE'),
      method: 'PUT',
      path: '/sap/bc/adt/programs/includes/ztest_include/source/main',
      headers: { Accept: 'text/plain', 'Content-Type': 'text/plain' },
    },
  ];
}

class IncludesModuleScenario extends ContractScenario {
  readonly name = 'Programs module – includes wiring';

  readonly operations: ContractOperation[] = [
    {
      name: 'programs.includes.get routed through module',
      contract: () => programsContract.includes.get('ZTEST_INCLUDE'),
      method: 'GET',
      path: '/sap/bc/adt/programs/includes/ztest_include',
      headers: { Accept: ACCEPT },
    },
  ];
}

// Run scenarios
runScenario(new IncludesScenario());
runScenario(new IncludeSourceScenario());
runScenario(new IncludesModuleScenario());
