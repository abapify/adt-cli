/**
 * ADT OO (Object-Oriented) Contracts
 *
 * Structure mirrors URL tree:
 * - /sap/bc/adt/oo/classes → oo.classes
 * - /sap/bc/adt/oo/interfaces → oo.interfaces
 * - /sap/bc/adt/oo/classrun → oo.classrun
 *
 * Supports full CRUD operations for ABAP classes and interfaces,
 * including source code management for class includes.
 */

// Re-export subcontracts
export {
  classesContract,
  type ClassesContract,
  type ClassIncludeType,
  type ClassResponse,
} from './classes';
export {
  interfacesContract,
  type InterfacesContract,
  type InterfaceResponse,
} from './interfaces';
export { classrunContract, type ClassrunContract } from './classrun';

// Import for aggregated contract
import { classesContract } from './classes';
import { interfacesContract } from './interfaces';
import { classrunContract } from './classrun';

/**
 * OO Contract type definition
 * Explicit type to avoid TypeScript inference limits
 */
export interface OoContract {
  classes: typeof classesContract;
  interfaces: typeof interfacesContract;
  classrun: typeof classrunContract;
}

export const ooContract: OoContract = {
  classes: classesContract,
  interfaces: interfacesContract,
  classrun: classrunContract,
};
