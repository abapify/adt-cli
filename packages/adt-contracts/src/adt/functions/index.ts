/**
 * ADT Functions Contracts
 *
 * Structure mirrors URL tree:
 * - /sap/bc/adt/functions/groups → functions.groups
 * - /sap/bc/adt/functions/groups/{group}/fmodules → functions.groups.fmodules
 */

export {
  functionGroupsContract,
  type FunctionGroupsContract,
  type FunctionGroupResponse,
} from './groups';

export {
  functionModulesContract,
  type FunctionModulesContract,
  type FunctionModuleResponse,
} from './fmodules';

import { functionGroupsContract } from './groups';
import { functionModulesContract } from './fmodules';

/**
 * Functions Contract type definition
 *
 * Function modules are nested under groups following the SAP URL pattern:
 *   /sap/bc/adt/functions/groups/{groupName}/fmodules/{fmName}
 */
export interface FunctionsContract {
  groups: typeof functionGroupsContract & {
    fmodules: typeof functionModulesContract;
  };
}

export const functionsContract: FunctionsContract = {
  groups: {
    ...functionGroupsContract,
    fmodules: functionModulesContract,
  },
};
