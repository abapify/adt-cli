/**
 * ADT Business Object (BO) Contracts
 *
 * Namespace: /sap/bc/adt/bo/...
 *
 * Currently hosts:
 *  - /sap/bc/adt/bo/behaviordefinitions  (BDEF — RAP behavior definition)
 */

export {
  behaviordefinitionsContract,
  type BehaviordefinitionsContract,
  type BehaviorDefinitionResponse,
} from './behaviordefinitions';

import { behaviordefinitionsContract } from './behaviordefinitions';

/**
 * BO Contract type definition
 */
export interface BoContract {
  behaviordefinitions: typeof behaviordefinitionsContract;
}

export const boContract: BoContract = {
  behaviordefinitions: behaviordefinitionsContract,
};
