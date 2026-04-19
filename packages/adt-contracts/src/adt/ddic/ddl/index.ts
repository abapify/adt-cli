/**
 * ADT CDS DDL Sources module
 */

export {
  ddlSourcesContract,
  type DdlSourcesContract,
  type DdlSourceResponse,
} from './sources';

import { ddlSourcesContract } from './sources';

export interface DdlContract {
  sources: typeof ddlSourcesContract;
}

export const ddlContract: DdlContract = {
  sources: ddlSourcesContract,
};
