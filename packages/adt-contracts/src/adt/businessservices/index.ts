/**
 * ADT Business Services Contracts
 *
 * Namespace: /sap/bc/adt/businessservices/...
 *
 * Currently hosts:
 *  - /sap/bc/adt/businessservices/bindings  (SRVB — RAP service binding)
 */

export {
  bindingsContract,
  type BindingsContract,
  type ServiceBindingResponse,
} from './bindings';

import { bindingsContract } from './bindings';

/**
 * Business Services Contract type definition
 */
export interface BusinessservicesContract {
  bindings: typeof bindingsContract;
}

export const businessservicesContract: BusinessservicesContract = {
  bindings: bindingsContract,
};
