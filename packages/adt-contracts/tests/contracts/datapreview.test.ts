/**
 * Datapreview Contract Scenarios
 *
 * The freestyle endpoint speaks JSON, so we verify:
 *  - Method / path / headers / query are correct
 *  - The response schema can parse the JSON fixture
 *  - The request-body schema round-trips raw SQL strings
 */

import { fixtures } from '@abapify/adt-fixtures';
import { ContractScenario, runScenario, type ContractOperation } from './base';
import { freestyle } from '../../src/adt/datapreview/freestyle';
import {
  dataPreviewFreestyleRequestSchema,
  dataPreviewFreestyleResponseSchema,
} from '../../src/adt/datapreview/schema';

class DatapreviewFreestyleScenario extends ContractScenario {
  readonly name = 'Datapreview Freestyle';

  readonly operations: ContractOperation[] = [
    {
      name: 'execute free-style SQL',
      contract: () => freestyle.post({ rowCount: 100 }),
      method: 'POST',
      path: '/sap/bc/adt/datapreview/freestyle',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'text/plain',
      },
      query: { outputFormat: 'json', rowCount: 100 },
      body: {
        schema: dataPreviewFreestyleRequestSchema,
      },
      response: {
        status: 200,
        schema: dataPreviewFreestyleResponseSchema,
        fixture: fixtures.datapreview.freestyle,
      },
    },
    {
      name: 'execute free-style SQL with noaging',
      contract: () => freestyle.post({ rowCount: 10, noaging: true }),
      method: 'POST',
      path: '/sap/bc/adt/datapreview/freestyle',
      query: { outputFormat: 'json', rowCount: 10, noaging: true },
      response: {
        status: 200,
        schema: dataPreviewFreestyleResponseSchema,
      },
    },
  ];
}

runScenario(new DatapreviewFreestyleScenario());
