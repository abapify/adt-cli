/**
 * ADT System Contracts - Aggregated
 */

export * from './users';

import { usersContract, type UsersContract } from './users';

export interface SystemContract {
  users: UsersContract;
}

export const systemContract: SystemContract = {
  users: usersContract,
};
