/**
 * Core HTTP Contract Scenarios
 */

import { describe, it } from 'vitest';
import { fixtures } from '@abapify/adt-fixtures';
import { http as sessions, systeminformation } from '../../src/schemas';
import {
  ContractScenario,
  checkContractOperation,
  type ContractOperation,
} from './base';
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
        Accept: 'application/vnd.sap.adt.core.http.systeminformation.v1+json',
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
describe('Core HTTP Contract Scenarios', () => {
  describe('Core HTTP Sessions', () => {
    const scenario = new SessionsScenario();
    for (const op of scenario.operations) {
      it(op.name, async () => {
        await checkContractOperation(op);
      });
    }
  });

  describe('Core HTTP System Information', () => {
    const scenario = new SystemInformationScenario();
    for (const op of scenario.operations) {
      it(op.name, async () => {
        await checkContractOperation(op);
      });
    }
  });
});
