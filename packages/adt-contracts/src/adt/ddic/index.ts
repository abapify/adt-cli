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
  tablesettingsContract,
  type TableSettingsContract,
} from './tablesettings';
export {
  tabletypesContract,
  type TabletypesContract,
  type TableTypeResponse,
} from './tabletypes';
export {
  ddlContract,
  ddlSourcesContract,
  type DdlContract,
  type DdlSourcesContract,
  type DdlSourceResponse,
} from './ddl';
export {
  dclContract,
  dclSourcesContract,
  type DclContract,
  type DclSourcesContract,
  type DclSourceResponse,
} from './dcl';

import { domainsContract } from './domains';
import { dataelementsContract } from './dataelements';
import { structuresContract } from './structures';
import { tablesContract } from './tables';
import { tablesettingsContract } from './tablesettings';
import { tabletypesContract } from './tabletypes';
import { ddlContract } from './ddl';
import { dclContract } from './dcl';

export interface DdicContract {
  domains: typeof domainsContract;
  dataelements: typeof dataelementsContract;
  structures: typeof structuresContract;
  tables: typeof tablesContract;
  tablesettings: typeof tablesettingsContract;
  tabletypes: typeof tabletypesContract;
  ddl: typeof ddlContract;
  dcl: typeof dclContract;
}

export const ddicContract: DdicContract = {
  domains: domainsContract,
  dataelements: dataelementsContract,
  structures: structuresContract,
  tables: tablesContract,
  tablesettings: tablesettingsContract,
  tabletypes: tabletypesContract,
  ddl: ddlContract,
  dcl: dclContract,
};
