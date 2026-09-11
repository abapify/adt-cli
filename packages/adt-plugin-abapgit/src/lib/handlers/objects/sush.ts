/**
 * SUSH (Authorization Object Hierarchy) handler for abapGit format
 *
 * Authorization object hierarchies are XML-only. The abapGit format stores
 * HEAD, USOBX, and USOBT nodes.
 */

import { sush } from '../../../schemas/generated';
import { createHandler } from '../base';

type AuthHierarchyLike = {
  name: string;
  displayName?: string;
  usobx?: Array<{
    name?: string;
    type?: string;
    object?: string;
    okFlag?: string;
  }>;
  usobt?: Array<{
    name?: string;
    type?: string;
    object?: string;
    field?: string;
    low?: string;
    high?: string;
  }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const authHierarchyHandler = createHandler<
  AuthHierarchyLike,
  typeof sush
>('SUSH', {
  schema: sush,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_SUSH',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    HEAD: {
      DISPLAY_NAME: obj.displayName ?? String(obj.name ?? '').toUpperCase(),
    },
    USOBX: obj.usobx?.length
      ? {
          item: obj.usobx.map((u) => ({
            NAME: u.name,
            TYPE: u.type,
            OBJECT: u.object,
            OKFLAG: u.okFlag,
          })),
        }
      : undefined,
    USOBT: obj.usobt?.length
      ? {
          item: obj.usobt.map((u) => ({
            NAME: u.name,
            TYPE: u.type,
            OBJECT: u.object,
            FIELD: u.field,
            LOW: u.low,
            HIGH: u.high,
          })),
        }
      : undefined,
  }),

  fromAbapGit: ({ HEAD, USOBX, USOBT }) => {
    const usobx = normalizeItems(USOBX?.item);
    const usobt = normalizeItems(USOBT?.item);
    return {
      name: (HEAD?.DISPLAY_NAME ?? '').toUpperCase(),
      displayName: HEAD?.DISPLAY_NAME,
      usobx: usobx.map((u) => ({
        name: u.NAME,
        type: u.TYPE,
        object: u.OBJECT,
        okFlag: u.OKFLAG,
      })),
      usobt: usobt.map((u) => ({
        name: u.NAME,
        type: u.TYPE,
        object: u.OBJECT,
        field: u.FIELD,
        low: u.LOW,
        high: u.HIGH,
      })),
    };
  },
});
