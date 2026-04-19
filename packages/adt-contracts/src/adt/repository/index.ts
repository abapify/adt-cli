/**
 * Repository Contracts
 */

export * from './informationsystem';
export * from './objectstructure';

import {
  informationsystemContract,
  type InformationSystemContract,
} from './informationsystem';
import {
  objectstructureContract,
  type ObjectstructureContract,
} from './objectstructure';

export interface RepositoryContract {
  informationsystem: InformationSystemContract;
  objectstructure: ObjectstructureContract;
}

export const repositoryContract: RepositoryContract = {
  informationsystem: informationsystemContract,
  objectstructure: objectstructureContract,
};
