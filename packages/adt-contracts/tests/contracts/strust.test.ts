/**
 * System Security / STRUST Contract Scenarios
 */

import { fixtures } from '@abapify/adt-fixtures';
import { atomFeed } from '../../src/schemas';
import { ContractScenario, runScenario, type ContractOperation } from './base';
import { psesContract } from '../../src/adt/system/security/pses';

class StrustScenario extends ContractScenario {
  readonly name = 'System Security / STRUST';

  readonly operations: ContractOperation[] = [
    {
      name: 'list PSEs',
      contract: () => psesContract.list(),
      method: 'GET',
      path: '/sap/bc/adt/system/security/pses',
      headers: { Accept: 'application/atom+xml;type=feed' },
      response: {
        status: 200,
        schema: atomFeed,
        fixture: fixtures.system.security.pseList,
      },
    },
    {
      name: 'get PSE',
      contract: () => psesContract.get('SSLC', 'DFAULT'),
      method: 'GET',
      path: '/sap/bc/adt/system/security/pses/SSLC/DFAULT',
      headers: { Accept: 'application/atom+xml;type=feed' },
      response: {
        status: 200,
        schema: atomFeed,
        fixture: fixtures.system.security.certList,
      },
    },
    {
      name: 'list certificates',
      contract: () => psesContract.listCertificates('SSLC', 'DFAULT'),
      method: 'GET',
      path: '/sap/bc/adt/system/security/pses/SSLC/DFAULT/certificates',
      headers: { Accept: 'application/atom+xml;type=feed' },
      response: {
        status: 200,
        schema: atomFeed,
        fixture: fixtures.system.security.certList,
      },
    },
    {
      name: 'upload certificate',
      contract: () => psesContract.uploadCertificate('SSLC', 'DFAULT'),
      method: 'POST',
      path: '/sap/bc/adt/system/security/pses/SSLC/DFAULT/certificates',
      headers: {
        Accept: 'application/atom+xml;type=feed',
        'Content-Type': 'application/x-pem-file',
      },
      response: {
        status: 200,
        schema: atomFeed,
        fixture: fixtures.system.security.certList,
      },
    },
    {
      name: 'delete certificate',
      contract: () => psesContract.deleteCertificate('SSLC', 'DFAULT', '1'),
      method: 'DELETE',
      path: '/sap/bc/adt/system/security/pses/SSLC/DFAULT/certificates/1',
    },
  ];
}

runScenario(new StrustScenario());
