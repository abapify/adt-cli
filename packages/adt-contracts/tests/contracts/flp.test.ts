/**
 * FLP (Fiori Launchpad) contract scenarios — E14.
 *
 * The FLP surface lives on the OData Page Builder service
 * (`/sap/opu/odata/UI2/PAGE_BUILDER_PERS/`). All contracts here request
 * `?$format=json` so the existing JSON adapter path can parse responses
 * without an OData XML parser.
 */

import { describe, it } from 'vitest';
import { fixtures } from '@abapify/adt-fixtures';
import {
  ContractScenario,
  checkContractOperation,
  type ContractOperation,
} from './base';
import { catalogs } from '../../src/adt/uifsa/catalogs';
import { groups } from '../../src/adt/uifsa/groups';
import { tiles } from '../../src/adt/uifsa/tiles';
import {
  flpCatalogListSchema,
  flpCatalogSchema,
  flpGroupListSchema,
  flpGroupSchema,
  flpTileListSchema,
  flpTileSchema,
} from '../../src/adt/uifsa/schema';

const CATALOG_ID = 'X-SAP-UI2-CATALOGPAGE:SAP_MOCK_DEV_CAT';
const ENCODED_CATALOG = `'${encodeURIComponent(CATALOG_ID)}'`;
const TILE_ID = 'X-SAP-UI2-CHIP:/MOCK/TILE_1';
const ENCODED_TILE = `'${encodeURIComponent(TILE_ID)}'`;
const GROUP_ID = '/UI2/MOCK_PAGE';
const ENCODED_GROUP = `'${encodeURIComponent(GROUP_ID)}'`;

const BASE = '/sap/opu/odata/UI2/PAGE_BUILDER_PERS';
const JSON_HEADERS = { Accept: 'application/json' } as const;
const JSON_QUERY = { $format: 'json' } as const;

class FlpCatalogsScenario extends ContractScenario {
  readonly name = 'FLP Catalogs';

  readonly operations: ContractOperation[] = [
    {
      name: 'list catalogs',
      contract: () => catalogs.list(),
      method: 'GET',
      path: `${BASE}/Catalogs`,
      headers: JSON_HEADERS,
      query: JSON_QUERY,
      response: {
        status: 200,
        schema: flpCatalogListSchema,
        fixture: fixtures.flp.catalogList,
      },
    },
    {
      name: 'get single catalog',
      contract: () => catalogs.get(CATALOG_ID),
      method: 'GET',
      path: `${BASE}/Catalogs(${ENCODED_CATALOG})`,
      headers: JSON_HEADERS,
      query: JSON_QUERY,
      response: {
        status: 200,
        schema: flpCatalogSchema,
        fixture: fixtures.flp.catalogSingle,
      },
    },
    {
      name: 'list tiles in catalog',
      contract: () => catalogs.tiles(CATALOG_ID),
      method: 'GET',
      path: `${BASE}/Catalogs(${ENCODED_CATALOG})/Chips`,
      headers: JSON_HEADERS,
      query: JSON_QUERY,
      response: {
        status: 200,
        schema: flpTileListSchema,
        fixture: fixtures.flp.tileList,
      },
    },
  ];
}

class FlpGroupsScenario extends ContractScenario {
  readonly name = 'FLP Groups';

  readonly operations: ContractOperation[] = [
    {
      name: 'list groups',
      contract: () => groups.list(),
      method: 'GET',
      path: `${BASE}/Pages`,
      headers: JSON_HEADERS,
      query: JSON_QUERY,
      response: {
        status: 200,
        schema: flpGroupListSchema,
        fixture: fixtures.flp.groupList,
      },
    },
    {
      name: 'get single group',
      contract: () => groups.get(GROUP_ID),
      method: 'GET',
      path: `${BASE}/Pages(${ENCODED_GROUP})`,
      headers: JSON_HEADERS,
      query: JSON_QUERY,
      // Response schema only — no fixture (single-entity shape not captured)
      response: { status: 200, schema: flpGroupSchema },
    },
  ];
}

class FlpTilesScenario extends ContractScenario {
  readonly name = 'FLP Tiles';

  readonly operations: ContractOperation[] = [
    {
      name: 'list tiles',
      contract: () => tiles.list(),
      method: 'GET',
      path: `${BASE}/Chips`,
      headers: JSON_HEADERS,
      query: JSON_QUERY,
      response: {
        status: 200,
        schema: flpTileListSchema,
        fixture: fixtures.flp.tileList,
      },
    },
    {
      name: 'get single tile',
      contract: () => tiles.get(TILE_ID),
      method: 'GET',
      path: `${BASE}/Chips(${ENCODED_TILE})`,
      headers: JSON_HEADERS,
      query: JSON_QUERY,
      response: {
        status: 200,
        schema: flpTileSchema,
        fixture: fixtures.flp.tileSingle,
      },
    },
  ];
}

describe('FLP (Fiori Launchpad) contract scenarios', () => {
  describe('FLP Catalogs', () => {
    const scenario = new FlpCatalogsScenario();
    for (const op of scenario.operations) {
      it(op.name, async () => {
        await checkContractOperation(op);
      });
    }
  });

  describe('FLP Groups', () => {
    const scenario = new FlpGroupsScenario();
    for (const op of scenario.operations) {
      it(op.name, async () => {
        await checkContractOperation(op);
      });
    }
  });

  describe('FLP Tiles', () => {
    const scenario = new FlpTilesScenario();
    for (const op of scenario.operations) {
      it(op.name, async () => {
        await checkContractOperation(op);
      });
    }
  });
});
