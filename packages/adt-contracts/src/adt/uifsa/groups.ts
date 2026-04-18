/**
 * Fiori Launchpad groups / pages — `/sap/opu/odata/UI2/PAGE_BUILDER_PERS/Pages`.
 *
 * Read-only in v1 (E14 scope).
 */

import { http } from '../../base';
import { flpGroupListSchema, flpGroupSchema } from './schema';

const BASE = '/sap/opu/odata/UI2/PAGE_BUILDER_PERS/Pages';

function encodeKey(id: string): string {
  return `'${encodeURIComponent(id)}'`;
}

/** List all pages / groups. */
const list = () =>
  http.get(BASE, {
    query: { $format: 'json' },
    responses: { 200: flpGroupListSchema },
    headers: { Accept: 'application/json' },
  });

/** Get a single page / group by ID (e.g. `/UI2/SAMPLE_PAGE`). */
const get = (id: string) =>
  http.get(`${BASE}(${encodeKey(id)})`, {
    query: { $format: 'json' },
    responses: { 200: flpGroupSchema },
    headers: { Accept: 'application/json' },
  });

export const groups = {
  list,
  get,
};

export type GroupsContract = typeof groups;
