/**
 * vit/wb Basic Object Properties contract scenarios
 *
 * Endpoint: /sap/bc/adt/vit/wb/object_type/{type}/object_name/{name}
 * Accept: application/vnd.sap.adt.basic.object.properties+xml
 */

import { describe, it } from 'vitest';
import { fixtures } from '@abapify/adt-fixtures';
import { adtcore } from '../../src/schemas';
import {
  ContractScenario,
  checkContractOperation,
  type ContractOperation,
} from './base';
import {
  BASIC_OBJECT_PROPERTIES_MIME,
  vitWbObjectPropertiesContract,
} from '../../src/adt/vit/wb/objectproperties';

class VitWbScenario extends ContractScenario {
  readonly name = 'vit/wb Basic Object Properties (classic BAdI)';

  readonly operations: ContractOperation[] = [
    {
      name: 'get classic BAdI definition',
      contract: () =>
        vitWbObjectPropertiesContract.getDefinition('MOCK_CTS_REQUEST_CHECK'),
      method: 'GET',
      path: '/sap/bc/adt/vit/wb/object_type/sxsdxd/object_name/mock_cts_request_check',
      headers: { Accept: BASIC_OBJECT_PROPERTIES_MIME },
      response: {
        status: 200,
        schema: adtcore,
        fixture: fixtures.vit.wb.sxsdxdSingle,
      },
    },
    {
      name: 'get classic BAdI implementation',
      contract: () =>
        vitWbObjectPropertiesContract.getImplementation(
          'ZE_MOCK_CLASSIC_BADI_IMPL',
        ),
      method: 'GET',
      path: '/sap/bc/adt/vit/wb/object_type/sxcixi/object_name/ze_mock_classic_badi_impl',
      headers: { Accept: BASIC_OBJECT_PROPERTIES_MIME },
      response: {
        status: 200,
        schema: adtcore,
        fixture: fixtures.vit.wb.sxcixiSingle,
      },
    },
  ];
}

describe('vit/wb Basic Object Properties contract scenarios', () => {
  describe('vit/wb Basic Object Properties (classic BAdI)', () => {
    const scenario = new VitWbScenario();
    for (const op of scenario.operations) {
      it(op.name, async () => {
        await checkContractOperation(op);
      });
    }
  });
});
