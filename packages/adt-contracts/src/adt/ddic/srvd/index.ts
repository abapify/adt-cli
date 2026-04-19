/**
 * ADT RAP Service Definition module
 */

export {
  srvdSourcesContract,
  type SrvdSourcesContract,
  type SrvdSourceResponse,
} from './sources';

import { srvdSourcesContract } from './sources';

export interface SrvdContract {
  sources: typeof srvdSourcesContract;
}

export const srvdContract: SrvdContract = {
  sources: srvdSourcesContract,
};
