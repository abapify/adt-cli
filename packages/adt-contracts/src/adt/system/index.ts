/**
 * ADT System Contracts - Aggregated
 */

export * from './users';
export * from './security/pses';

import { usersContract, type UsersContract } from './users';
import { psesContract, type PsesContract } from './security/pses';

export interface SystemSecurityContract {
  pses: PsesContract;
}

export interface SystemContract {
  users: UsersContract;
  security: SystemSecurityContract;
}

export const systemContract: SystemContract = {
  users: usersContract,
  security: {
    pses: psesContract,
  },
};
