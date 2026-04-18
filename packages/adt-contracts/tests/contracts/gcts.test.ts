/**
 * gCTS contract scenarios.
 *
 * gCTS is JSON-native, so we verify:
 *   - Method / path / headers / query are correct
 *   - Response schemas parse the JSON fixtures from adt-fixtures
 *   - Request-body schemas build valid JSON payloads
 */

import { fixtures } from '@abapify/adt-fixtures';
import { ContractScenario, runScenario, type ContractOperation } from './base';
import { repository } from '../../src/adt/gcts/repository';
import { branches } from '../../src/adt/gcts/branches';
import { commits } from '../../src/adt/gcts/commits';
import { config } from '../../src/adt/gcts/config';
import {
  gctsRepositoriesSchema,
  gctsRepositorySchema,
  gctsCreateRepositoryBodySchema,
  gctsBranchesSchema,
  gctsCreateBranchBodySchema,
  gctsCreateBranchResponseSchema,
  gctsLogSchema,
  gctsPullSchema,
  gctsObjectsSchema,
  gctsConfigSchema,
  gctsSetConfigBodySchema,
  gctsCommitBodySchema,
  gctsCommitResponseSchema,
  gctsGenericOkSchema,
} from '../../src/adt/gcts/schema';

const RID = 'example-repo';

class GctsRepositoryScenario extends ContractScenario {
  readonly name = 'gCTS Repository';

  readonly operations: ContractOperation[] = [
    {
      name: 'list repositories',
      contract: () => repository.list(),
      method: 'GET',
      path: '/sap/bc/cts_abapvcs/repository',
      headers: { Accept: 'application/json' },
      response: {
        status: 200,
        schema: gctsRepositoriesSchema,
        fixture: fixtures.gcts.repositories,
      },
    },
    {
      name: 'get single repository',
      contract: () => repository.get(RID),
      method: 'GET',
      path: `/sap/bc/cts_abapvcs/repository/${RID}`,
      headers: { Accept: 'application/json' },
      response: {
        status: 200,
        schema: gctsRepositorySchema,
        fixture: fixtures.gcts.repository,
      },
    },
    {
      name: 'create repository',
      contract: () => repository.create(),
      method: 'POST',
      path: '/sap/bc/cts_abapvcs/repository',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: { schema: gctsCreateRepositoryBodySchema },
      response: {
        status: 201,
        schema: gctsRepositorySchema,
        fixture: fixtures.gcts.createResponse,
      },
    },
    {
      name: 'delete repository',
      contract: () => repository.delete(RID),
      method: 'DELETE',
      path: `/sap/bc/cts_abapvcs/repository/${RID}`,
      response: { status: 200, schema: gctsGenericOkSchema },
    },
    {
      name: 'clone repository',
      contract: () => repository.clone(RID),
      method: 'POST',
      path: `/sap/bc/cts_abapvcs/repository/${RID}/clone`,
      response: { status: 200, schema: gctsGenericOkSchema },
    },
    {
      name: 'pull repository',
      contract: () => repository.pull(RID),
      method: 'GET',
      path: `/sap/bc/cts_abapvcs/repository/${RID}/pullByCommit`,
      response: {
        status: 200,
        schema: gctsPullSchema,
        fixture: fixtures.gcts.pull,
      },
    },
    {
      name: 'push repository',
      contract: () => repository.push(RID),
      method: 'GET',
      path: `/sap/bc/cts_abapvcs/repository/${RID}/push`,
      response: { status: 200, schema: gctsGenericOkSchema },
    },
    {
      name: 'checkout branch',
      contract: () => repository.checkout(RID, 'main', 'feature/new'),
      method: 'GET',
      path: `/sap/bc/cts_abapvcs/repository/${RID}/branches/main/switch`,
      query: { branch: 'feature/new' },
      response: { status: 200, schema: gctsGenericOkSchema },
    },
    {
      name: 'log commits',
      contract: () => repository.log(RID),
      method: 'GET',
      path: `/sap/bc/cts_abapvcs/repository/${RID}/getCommit`,
      response: {
        status: 200,
        schema: gctsLogSchema,
        fixture: fixtures.gcts.log,
      },
    },
    {
      name: 'list repository objects',
      contract: () => repository.objects(RID),
      method: 'GET',
      path: `/sap/bc/cts_abapvcs/repository/${RID}/getObjects`,
      response: {
        status: 200,
        schema: gctsObjectsSchema,
        fixture: fixtures.gcts.objects,
      },
    },
  ];
}

class GctsBranchesScenario extends ContractScenario {
  readonly name = 'gCTS Branches';

  readonly operations: ContractOperation[] = [
    {
      name: 'list branches',
      contract: () => branches.list(RID),
      method: 'GET',
      path: `/sap/bc/cts_abapvcs/repository/${RID}/branches`,
      response: {
        status: 200,
        schema: gctsBranchesSchema,
        fixture: fixtures.gcts.branches,
      },
    },
    {
      name: 'create branch',
      contract: () => branches.create(RID),
      method: 'POST',
      path: `/sap/bc/cts_abapvcs/repository/${RID}/branches`,
      body: { schema: gctsCreateBranchBodySchema },
      response: {
        status: 200,
        schema: gctsCreateBranchResponseSchema,
        fixture: fixtures.gcts.createBranch,
      },
    },
    {
      name: 'delete branch',
      contract: () => branches.delete(RID, 'feature/old'),
      method: 'DELETE',
      path: `/sap/bc/cts_abapvcs/repository/${RID}/branches/feature/old`,
      response: { status: 200, schema: gctsGenericOkSchema },
    },
  ];
}

class GctsCommitsScenario extends ContractScenario {
  readonly name = 'gCTS Commits';

  readonly operations: ContractOperation[] = [
    {
      name: 'commit objects',
      contract: () => commits.commit(RID),
      method: 'POST',
      path: `/sap/bc/cts_abapvcs/repository/${RID}/commit`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: { schema: gctsCommitBodySchema },
      response: { status: 200, schema: gctsCommitResponseSchema },
    },
  ];
}

class GctsConfigScenario extends ContractScenario {
  readonly name = 'gCTS Config';

  readonly operations: ContractOperation[] = [
    {
      name: 'get config entry',
      contract: () => config.get(RID, 'VCS_TARGET_DIR'),
      method: 'GET',
      path: `/sap/bc/cts_abapvcs/repository/${RID}/config/VCS_TARGET_DIR`,
      response: {
        status: 200,
        schema: gctsConfigSchema,
        fixture: fixtures.gcts.config,
      },
    },
    {
      name: 'set config entry',
      contract: () => config.set(RID),
      method: 'POST',
      path: `/sap/bc/cts_abapvcs/repository/${RID}/config`,
      body: { schema: gctsSetConfigBodySchema },
      response: { status: 200, schema: gctsGenericOkSchema },
    },
    {
      name: 'delete config entry',
      contract: () => config.delete(RID, 'VCS_TARGET_DIR'),
      method: 'DELETE',
      path: `/sap/bc/cts_abapvcs/repository/${RID}/config/VCS_TARGET_DIR`,
      response: { status: 200, schema: gctsGenericOkSchema },
    },
  ];
}

runScenario(new GctsRepositoryScenario());
runScenario(new GctsBranchesScenario());
runScenario(new GctsCommitsScenario());
runScenario(new GctsConfigScenario());
