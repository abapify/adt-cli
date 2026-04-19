/**
 * Typed interface for the subset of the ADT client used by the gCTS CLI.
 *
 * The `CliContext.getAdtClient()` factory (provided by `adt-cli`) returns
 * `Promise<unknown>`. To keep the plugin self-contained, we declare the
 * exact shape we need here, structurally matching `client.adt.gcts.*` from
 * `@abapify/adt-contracts`.
 */

import type {
  GctsRepositoryEnvelope,
  GctsRepositoriesResponse,
  GctsBranchesResponse,
  GctsCreateBranchResponse,
  GctsLogResponse,
  GctsPullResponse,
  GctsObjectsResponse,
  GctsConfigResponse,
  GctsCreateRepositoryRequest,
  GctsCreateBranchRequest,
  GctsCommitRequest,
  GctsSetConfigRequest,
} from '@abapify/adt-contracts';

export interface GctsClient {
  adt: {
    gcts: {
      repository: {
        list: () => Promise<GctsRepositoriesResponse>;
        get: (rid: string) => Promise<GctsRepositoryEnvelope>;
        create: (
          body: GctsCreateRepositoryRequest,
        ) => Promise<GctsRepositoryEnvelope>;
        delete: (rid: string) => Promise<Record<string, unknown>>;
        clone: (rid: string) => Promise<Record<string, unknown>>;
        pull: (rid: string) => Promise<GctsPullResponse>;
        push: (rid: string) => Promise<Record<string, unknown>>;
        checkout: (
          rid: string,
          currentBranch: string,
          targetBranch: string,
        ) => Promise<Record<string, unknown>>;
        log: (rid: string) => Promise<GctsLogResponse>;
        objects: (rid: string) => Promise<GctsObjectsResponse>;
        setItem: (
          rid: string,
          body: Record<string, unknown>,
        ) => Promise<Record<string, unknown>>;
      };
      branches: {
        list: (rid: string) => Promise<GctsBranchesResponse>;
        create: (
          rid: string,
          body: GctsCreateBranchRequest,
        ) => Promise<GctsCreateBranchResponse>;
        delete: (rid: string, name: string) => Promise<Record<string, unknown>>;
        switch: (
          rid: string,
          currentBranch: string,
          target: string,
        ) => Promise<Record<string, unknown>>;
      };
      commits: {
        commit: (
          rid: string,
          body: GctsCommitRequest,
        ) => Promise<Record<string, unknown>>;
      };
      config: {
        get: (rid: string, key: string) => Promise<GctsConfigResponse>;
        set: (
          rid: string,
          body: GctsSetConfigRequest,
        ) => Promise<Record<string, unknown>>;
        delete: (rid: string, key: string) => Promise<Record<string, unknown>>;
      };
    };
  };
}

import type { CliContext } from '@abapify/adt-plugin';

/**
 * Resolve a `GctsClient` from the CLI context, printing a friendly error and
 * exiting when no authenticated client is available (mirrors the pattern in
 * `@abapify/adt-atc`).
 */
export async function getGctsClient(ctx: CliContext): Promise<GctsClient> {
  if (!ctx.getAdtClient) {
    ctx.logger.error(
      '❌ ADT client not available. gCTS commands require authentication.',
    );
    ctx.logger.error('   Run: adt auth login');
    process.exit(1);
  }
  return (await ctx.getAdtClient()) as GctsClient;
}
