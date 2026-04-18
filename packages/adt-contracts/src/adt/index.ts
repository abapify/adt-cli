/**
 * ADT Contracts - Aggregated
 */

export * from './cts';
export * from './atc';
export * from './aunit';
export * from './oo';
export * from './discovery';
export * from './packages';
export * from './core';
export * from './repository';
export * from './programs';
export * from './functions';
export * from './ddic';
export * from './system';
export * from './checkruns';
export * from './activation';
export * from './datapreview';
export * from './runtime';
export * from './gcts';
export * from './bo';
export * from './businessservices';

/**
 * Complete ADT Contract
 */
import { ctsContract, type CtsContract } from './cts';
import { atcContract, type AtcContract } from './atc';
import { aunitContract, type AunitContract } from './aunit';
import { ooContract, type OoContract } from './oo';
import { discoveryContract, type DiscoveryContract } from './discovery';
import { packagesContract, type PackagesContract } from './packages';
import { coreContract, type CoreContract } from './core';
import { repositoryContract, type RepositoryContract } from './repository';
import {
  programsModuleContract,
  type ProgramsModuleContract,
} from './programs';
import { functionsContract, type FunctionsContract } from './functions';
import { ddicContract, type DdicContract } from './ddic';
import { systemContract, type SystemContract } from './system';
import { checkrunsContract, type CheckrunsContract } from './checkruns';
import { activationContract, type ActivationContract } from './activation';
import { datapreviewContract, type DatapreviewContract } from './datapreview';
import { runtimeContract, type RuntimeContract } from './runtime';
import { gctsContract, type GctsContract } from './gcts';
import { boContract, type BoContract } from './bo';
import {
  businessservicesContract,
  type BusinessservicesContract,
} from './businessservices';

/**
 * Explicit type to avoid TS7056 "inferred type exceeds maximum length"
 */
export interface AdtContract {
  cts: CtsContract;
  atc: AtcContract;
  aunit: AunitContract;
  oo: OoContract;
  discovery: DiscoveryContract;
  packages: PackagesContract;
  core: CoreContract;
  repository: RepositoryContract;
  programs: ProgramsModuleContract;
  functions: FunctionsContract;
  ddic: DdicContract;
  system: SystemContract;
  checkruns: CheckrunsContract;
  activation: ActivationContract;
  datapreview: DatapreviewContract;
  runtime: RuntimeContract;
  gcts: GctsContract;
  bo: BoContract;
  businessservices: BusinessservicesContract;
}

export const adtContract: AdtContract = {
  cts: ctsContract,
  atc: atcContract,
  aunit: aunitContract,
  oo: ooContract,
  discovery: discoveryContract,
  packages: packagesContract,
  core: coreContract,
  repository: repositoryContract,
  programs: programsModuleContract,
  functions: functionsContract,
  ddic: ddicContract,
  system: systemContract,
  checkruns: checkrunsContract,
  activation: activationContract,
  datapreview: datapreviewContract,
  runtime: runtimeContract,
  gcts: gctsContract,
  bo: boContract,
  businessservices: businessservicesContract,
};

// Import RestClient from base for client type definition
import type { RestClient } from '../base';

/**
 * Type for the ADT client instance
 * Use this when you need to type a variable holding the client
 */
export type AdtClientType = RestClient<AdtContract>;
