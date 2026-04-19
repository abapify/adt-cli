/**
 * /sap/bc/cts_abapvcs/repository/<rid>/commit
 *
 * Commit endpoint. Shapes mirror sapcli's
 * `Repository.commit` / `commit_package` / `commit_transport`.
 */

import { http } from '../../base';
import { gctsCommitBodySchema, gctsCommitResponseSchema } from './schema';

const commit = (rid: string) =>
  http.post(`/sap/bc/cts_abapvcs/repository/${rid}/commit`, {
    body: gctsCommitBodySchema,
    responses: { 200: gctsCommitResponseSchema },
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

export const commits = {
  commit,
};

export type CommitsContract = typeof commits;
