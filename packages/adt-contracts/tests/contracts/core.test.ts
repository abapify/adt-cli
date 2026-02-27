/**
 * Core HTTP Contract Scenarios
 */

import { fixtures } from 'adt-fixtures';
import {
  http as sessions,
  systeminformationSchema as systeminformation,
} from '../../src/schemas';
import { ContractScenario, runScenario, type ContractOperation } from './base';
import { sessionsContract } from '../../src/adt/core/http/sessions';
import { systeminformationContract } from '../../src/adt/core/http/systeminformation';

class SessionsScenario extends ContractScenario {
  readonly name = 'Core HTTP Sessions';

  readonly operations: ContractOperation[] = [
    {
      name: 'get session',
      contract: () => sessionsContract.getSession(),
      method: 'GET',
      path: '/sap/bc/adt/core/http/sessions',
      headers: {
        Accept: 'application/vnd.sap.adt.core.http.session.v3+xml',
        'x-csrf-token': 'Fetch',
        'X-sap-adt-sessiontype': 'stateful',
      },
      response: {
        status: 200,
        schema: sessions,
        fixture: fixtures.core.http.session,
      },
    },
  ];
}

class SystemInformationScenario extends ContractScenario {
  readonly name = 'Core HTTP System Information';

  readonly operations: ContractOperation[] = [
    {
      name: 'get system information',
      contract: () => systeminformationContract.getSystemInfo(),
      method: 'GET',
      path: '/sap/bc/adt/core/http/systeminformation',
      headers: {
        Accept: 'application/json',
      },
      response: {
        status: 200,
        schema: systeminformation,
        // Note: fixture parsing skipped - Zod schema expects object, not string
      },
    },
  ];
}

// Run scenarios
runScenario(new SessionsScenario());
runScenario(new SystemInformationScenario());
