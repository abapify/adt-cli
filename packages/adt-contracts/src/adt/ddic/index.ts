/**
 * DDIC (Data Dictionary) Contracts
 *
 * Covers all DDIC object types:
 * - Domains (DOMA)
 * - Data Elements (DTEL)
 * - Structures (TABL/DS)
 * - Database Tables (TABL/DT)
 * - Table Types (TTYP)
 */

export {
  domainsContract,
  type DomainsContract,
  type DomainResponse,
} from './domains';
export {
  dataelementsContract,
  type DataelementsContract,
  type DataElementResponse,
} from './dataelements';
export {
  structuresContract,
  type StructuresContract,
  type StructureResponse,
} from './structures';
export {
  tablesContract,
  type TablesContract,
  type TableResponse,
} from './tables';
export {
  tabletypesContract,
  type TabletypesContract,
  type TableTypeResponse,
} from './tabletypes';

import { domainsContract } from './domains';
import { dataelementsContract } from './dataelements';
import { structuresContract } from './structures';
import { tablesContract } from './tables';
import { tabletypesContract } from './tabletypes';

export interface DdicContract {
  domains: typeof domainsContract;
  dataelements: typeof dataelementsContract;
  structures: typeof structuresContract;
  tables: typeof tablesContract;
  tabletypes: typeof tabletypesContract;
}

export const ddicContract: DdicContract = {
  domains: domainsContract,
  dataelements: dataelementsContract,
  structures: structuresContract,
  tables: tablesContract,
  tabletypes: tabletypesContract,
};
