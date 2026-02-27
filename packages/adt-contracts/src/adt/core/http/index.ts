/**
 * Core HTTP Contracts
 */

export * from './sessions';
export * from './systeminformation';

import { sessionsContract, type SessionsContract } from './sessions';
import {
  systeminformationContract,
  type SystemInformationContract,
} from './systeminformation';

export interface HttpContract {
  sessions: SessionsContract;
  systeminformation: SystemInformationContract;
}

export const httpContract: HttpContract = {
  sessions: sessionsContract,
  systeminformation: systeminformationContract,
};
