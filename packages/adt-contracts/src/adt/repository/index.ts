/**
 * Repository Contracts
 */

export * from './informationsystem';

import {
  informationsystemContract,
  type InformationSystemContract,
} from './informationsystem';

export interface RepositoryContract {
  informationsystem: InformationSystemContract;
}

export const repositoryContract: RepositoryContract = {
  informationsystem: informationsystemContract,
};
