/**
 * /sap/bc/cts_abapvcs/repository/<rid>/branches
 *
 * Branch management endpoints.
 */

import { http } from '../../base';
import {
  gctsBranchesSchema,
  gctsCreateBranchBodySchema,
  gctsCreateBranchResponseSchema,
  gctsGenericOkSchema,
} from './schema';

const base = (rid: string) => `/sap/bc/cts_abapvcs/repository/${rid}/branches`;

const list = (rid: string) =>
  http.get(base(rid), {
    responses: { 200: gctsBranchesSchema },
    headers: { Accept: 'application/json' },
  });

const create = (rid: string) =>
  http.post(base(rid), {
    body: gctsCreateBranchBodySchema,
    responses: { 200: gctsCreateBranchResponseSchema },
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

const del = (rid: string, name: string) =>
  http.delete(`${base(rid)}/${name}`, {
    responses: { 200: gctsGenericOkSchema },
    headers: { Accept: 'application/json' },
  });

/**
 * Switch branches (GET /repository/<rid>/branches/<current>/switch?branch=X).
 * Alias of `repository.checkout` — exposed here for discoverability when
 * working with the `branches` sub-surface.
 */
const switchBranch = (rid: string, currentBranch: string, target: string) =>
  http.get(`${base(rid)}/${currentBranch}/switch`, {
    query: { branch: target },
    responses: { 200: gctsGenericOkSchema },
    headers: { Accept: 'application/json' },
  });

export const branches = {
  list,
  create,
  delete: del,
  switch: switchBranch,
};

export type BranchesContract = typeof branches;
