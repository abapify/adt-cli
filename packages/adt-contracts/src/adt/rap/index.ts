/**
 * RAP (RESTful ABAP Programming) Contracts
 *
 * Supports RAP-specific ADT operations:
 * - /sap/bc/adt/rap/behaviours → Behaviour Definitions (BDEF)
 * - /sap/bc/adt/ddl/ddls → CDS View Entities (DDLS)
 * - /sap/bc/adt/rap/generator → RAP Generator workspace
 *
 * RAP is SAP's modern ABAP development paradigm combining CDS, behavior
 * definitions, and service binding for OData exposure.
 */

export {
  behaviourDefinitionsContract,
  behaviourdefinitionContract,
  type BehaviourDefinitionsContract,
  type BehaviorDefinitionResponse,
} from './behaviours';

export { ddlsContract, type DdlsContract, type DdlsResponse } from './ddls';

export { rapGeneratorContract, type RapGeneratorContract } from './generator';

import {
  behaviourDefinitionsContract,
  type BehaviourDefinitionsContract,
} from './behaviours';
import { ddlsContract, type DdlsContract } from './ddls';
import { rapGeneratorContract, type RapGeneratorContract } from './generator';

export interface RapContract {
  behaviourDefinitions: BehaviourDefinitionsContract;
  ddls: DdlsContract;
  rapGenerator: RapGeneratorContract;
}

export const rapContract: RapContract = {
  behaviourDefinitions: behaviourDefinitionsContract,
  ddls: ddlsContract,
  rapGenerator: rapGeneratorContract,
};
