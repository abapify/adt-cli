/**
 * ADT Enhancement Framework Contracts
 *
 * Namespace: /sap/bc/adt/enhancements/...
 *
 * Currently hosts:
 *  - /sap/bc/adt/enhancements/enhoxhh  (ENHO/XHH — BAdI impl container)
 *
 * Other enhancement sub-types (enhoxh, enhoxhb, enhsxs, enhsxsb) are
 * documented in the discovery service but not yet modelled — add as
 * demand arises.
 */

export {
  enhoxhhContract,
  type EnhoxhhContract,
  type BadiResponse,
} from './enhoxhh';

import { enhoxhhContract } from './enhoxhh';

/** Enhancement-area contract shape. */
export interface EnhancementsContract {
  enhoxhh: typeof enhoxhhContract;
}

export const enhancementsContract: EnhancementsContract = {
  enhoxhh: enhoxhhContract,
};
