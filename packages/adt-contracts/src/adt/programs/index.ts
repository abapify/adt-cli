/**
 * ADT Programs Contracts
 *
 * Structure mirrors URL tree:
 * - /sap/bc/adt/programs/programs → programs.programs
 * - /sap/bc/adt/programs/includes → programs.includes
 */

export {
  programsContract,
  type ProgramsContract,
  type ProgramResponse,
} from './programs';

export {
  includesContract,
  type IncludesContract,
  type IncludeResponse,
} from './includes';

import { programsContract } from './programs';
import { includesContract } from './includes';

/**
 * Programs Contract type definition
 */
export interface ProgramsModuleContract {
  programs: typeof programsContract;
  includes: typeof includesContract;
}

export const programsModuleContract: ProgramsModuleContract = {
  programs: programsContract,
  includes: includesContract,
};
