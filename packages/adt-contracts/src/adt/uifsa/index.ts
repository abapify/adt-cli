/**
 * FLP (Fiori Launchpad) contracts — `client.adt.flp.*`.
 *
 * NOTE: The directory is named `uifsa` to match the epic spec
 * (E14 pointed at `/sap/bc/adt/uifsa/`), but the actual endpoints
 * live on the Page Builder OData service (`/sap/opu/odata/UI2/
 * PAGE_BUILDER_PERS/`). The namespace on the client is `flp` —
 * matching sapcli's user-facing command name.
 */

import { catalogs, type CatalogsContract } from './catalogs';
import { groups, type GroupsContract } from './groups';
import { tiles, type TilesContract } from './tiles';

export * from './schema';
export interface FlpContract {
  catalogs: CatalogsContract;
  groups: GroupsContract;
  tiles: TilesContract;
}

export const flpContract: FlpContract = {
  catalogs,
  groups,
  tiles,
};
export type { GroupsContract } from './groups';
export type { TilesContract } from './tiles';
export type { CatalogsContract } from './catalogs';
