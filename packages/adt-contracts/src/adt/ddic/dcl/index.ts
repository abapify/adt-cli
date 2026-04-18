/**
 * ADT CDS DCL (Access Control) Sources module
 */

export {
  dclSourcesContract,
  type DclSourcesContract,
  type DclSourceResponse,
} from './sources';

import { dclSourcesContract } from './sources';

export interface DclContract {
  sources: typeof dclSourcesContract;
}

export const dclContract: DclContract = {
  sources: dclSourcesContract,
};
