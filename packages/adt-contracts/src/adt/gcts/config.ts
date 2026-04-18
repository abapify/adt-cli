/**
 * /sap/bc/cts_abapvcs/repository/<rid>/config
 *
 * Repository configuration endpoints (key/value pairs).
 */

import { http } from '../../base';
import {
  gctsConfigSchema,
  gctsSetConfigBodySchema,
  gctsGenericOkSchema,
} from './schema';

const base = (rid: string) => `/sap/bc/cts_abapvcs/repository/${rid}/config`;

/** GET single config value: /repository/<rid>/config/<key>. */
const get = (rid: string, key: string) =>
  http.get(`${base(rid)}/${key}`, {
    responses: { 200: gctsConfigSchema },
    headers: { Accept: 'application/json' },
  });

/** POST /repository/<rid>/config — body `{ key, value }`. */
const set = (rid: string) =>
  http.post(base(rid), {
    body: gctsSetConfigBodySchema,
    responses: { 200: gctsGenericOkSchema },
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

/** DELETE /repository/<rid>/config/<key>. */
const del = (rid: string, key: string) =>
  http.delete(`${base(rid)}/${key}`, {
    responses: { 200: gctsGenericOkSchema },
    headers: { Accept: 'application/json' },
  });

export const config = {
  get,
  set,
  delete: del,
};

export type ConfigContract = typeof config;
