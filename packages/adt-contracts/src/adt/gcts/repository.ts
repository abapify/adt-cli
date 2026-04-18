/**
 * /sap/bc/cts_abapvcs/repository/**
 *
 * gCTS repository endpoints. Shapes mirror sapcli's
 * `Repository` / `simple.fetch_repos` behaviour.
 */

import { http } from '../../base';
import {
  gctsRepositoriesSchema,
  gctsRepositorySchema,
  gctsCreateRepositoryBodySchema,
  gctsSetItemBodySchema,
  gctsGenericOkSchema,
  gctsLogSchema,
  gctsPullSchema,
  gctsObjectsSchema,
} from './schema';

const BASE = '/sap/bc/cts_abapvcs/repository';

/** List all repositories (GET /repository). */
const list = () =>
  http.get(BASE, {
    responses: { 200: gctsRepositoriesSchema },
    headers: { Accept: 'application/json' },
  });

/** Get a single repository (GET /repository/<rid>). */
const get = (rid: string) =>
  http.get(`${BASE}/${rid}`, {
    responses: { 200: gctsRepositorySchema },
    headers: { Accept: 'application/json' },
  });

/** Create a new repository (POST /repository). */
const create = () =>
  http.post(BASE, {
    body: gctsCreateRepositoryBodySchema,
    responses: { 201: gctsRepositorySchema, 200: gctsRepositorySchema },
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

/** Delete a repository (DELETE /repository/<rid>). */
const del = (rid: string) =>
  http.delete(`${BASE}/${rid}`, {
    responses: { 200: gctsGenericOkSchema, 204: gctsGenericOkSchema },
    headers: { Accept: 'application/json' },
  });

/** Clone (POST /repository/<rid>/clone). */
const clone = (rid: string) =>
  http.post(`${BASE}/${rid}/clone`, {
    responses: { 200: gctsGenericOkSchema },
    headers: { Accept: 'application/json' },
  });

/** Pull (GET /repository/<rid>/pullByCommit). */
const pull = (rid: string) =>
  http.get(`${BASE}/${rid}/pullByCommit`, {
    responses: { 200: gctsPullSchema },
    headers: { Accept: 'application/json' },
  });

/** Push (GET /repository/<rid>/push) — gCTS uses GET, not POST. */
const push = (rid: string) =>
  http.get(`${BASE}/${rid}/push`, {
    responses: { 200: gctsGenericOkSchema },
    headers: { Accept: 'application/json' },
  });

/**
 * Checkout (GET /repository/<rid>/branches/<currentBranch>/switch?branch=X).
 * Caller must supply both the *current* branch (path) and the *target* branch
 * (query) — mirrors sapcli's `Repository.checkout`.
 */
const checkout = (rid: string, currentBranch: string, targetBranch: string) =>
  http.get(`${BASE}/${rid}/branches/${currentBranch}/switch`, {
    query: { branch: targetBranch },
    responses: { 200: gctsGenericOkSchema },
    headers: { Accept: 'application/json' },
  });

/** Commit history (GET /repository/<rid>/getCommit). */
const log = (rid: string) =>
  http.get(`${BASE}/${rid}/getCommit`, {
    responses: { 200: gctsLogSchema },
    headers: { Accept: 'application/json' },
  });

/** Object list (GET /repository/<rid>/getObjects). */
const objects = (rid: string) =>
  http.get(`${BASE}/${rid}/getObjects`, {
    responses: { 200: gctsObjectsSchema },
    headers: { Accept: 'application/json' },
  });

/**
 * Set a repository property (POST /repository/<rid>).
 * Body is `{ <property>: <value> }`, e.g. `{ role: 'TARGET' }` or
 * `{ url: 'https://…' }`.
 */
const setItem = (rid: string) =>
  http.post(`${BASE}/${rid}`, {
    body: gctsSetItemBodySchema,
    responses: { 200: gctsGenericOkSchema },
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

export const repository = {
  list,
  get,
  create,
  delete: del,
  clone,
  pull,
  push,
  checkout,
  log,
  objects,
  setItem,
};

export type RepositoryContract = typeof repository;
