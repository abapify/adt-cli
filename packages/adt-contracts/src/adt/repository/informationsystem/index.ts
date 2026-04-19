/**
 * Repository Information System Contracts
 */

export * from './search';
export * from './usagereferences';

import { searchContract, type SearchContract } from './search';
import {
  usageReferencesContract,
  type UsageReferencesContract,
} from './usagereferences';

export interface InformationSystemContract {
  search: SearchContract;
  usageReferences: UsageReferencesContract;
}

export const informationsystemContract: InformationSystemContract = {
  search: searchContract,
  usageReferences: usageReferencesContract,
};
