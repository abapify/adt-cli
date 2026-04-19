/**
 * /sap/bc/cts_abapvcs — gCTS (git-enabled CTS) contracts.
 *
 * Separate REST surface from /sap/bc/adt. Exposed as `client.adt.gcts.*`
 * for parity with sapcli's `sap gcts` CLI surface.
 */

import {
  repository,
  type RepositoryContract as GctsRepositoryContract,
} from './repository';
import {
  branches,
  type BranchesContract as GctsBranchesContract,
} from './branches';
import {
  commits,
  type CommitsContract as GctsCommitsContract,
} from './commits';
import { config, type ConfigContract as GctsConfigContract } from './config';

// Re-export schema types only. The individual sub-namespaces
// (repository/branches/commits/config) are accessed through the
// `gctsContract` tree below to avoid collisions with the top-level
// `repository` / `packages` namespaces in `adt/index.ts`.
export * from './schema';
export type {
  GctsRepositoryContract,
  GctsBranchesContract,
  GctsCommitsContract,
  GctsConfigContract,
};

export interface GctsContract {
  repository: GctsRepositoryContract;
  branches: GctsBranchesContract;
  commits: GctsCommitsContract;
  config: GctsConfigContract;
}

export const gctsContract: GctsContract = {
  repository,
  branches,
  commits,
  config,
};
