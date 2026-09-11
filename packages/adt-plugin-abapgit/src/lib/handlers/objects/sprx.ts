/**
 * SPRX (Proxy Object) handler for abapGit format
 */

import { sprx } from '../../../schemas/generated';
import { createHandler } from '../base';

type ProxyObjectLike = {
  name: string;
  headers?: Array<{
    object?: string;
    objName?: string;
    ifrType?: string;
    ifrName?: string;
    ifrNspce?: string;
  }>;
  data?: Array<{
    object?: string;
    objName?: string;
    ifrType?: string;
    ifrName?: string;
    ifrText?: string;
    r3Type?: string;
    r3Name?: string;
  }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const proxyObjectHandler = createHandler<ProxyObjectLike, typeof sprx>(
  'SPRX',
  {
    schema: sprx,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SPRX',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      PROXY_HEADER: obj.headers?.length
        ? { item: obj.headers.map((h) => ({
            OBJECT: h.object,
            OBJ_NAME: h.objName,
            IFR_TYPE: h.ifrType,
            IFR_NAME: h.ifrName,
            IFR_NSPCE: h.ifrNspce,
          })) }
        : undefined,
      PROXY_DATA: obj.data?.length
        ? { item: obj.data.map((d) => ({
            OBJECT: d.object,
            OBJ_NAME: d.objName,
            IFR_TYPE: d.ifrType,
            IFR_NAME: d.ifrName,
            IFR_TEXT: d.ifrText,
            R3_TYPE: d.r3Type,
            R3_NAME: d.r3Name,
          })) }
        : undefined,
    }),

    fromAbapGit: ({ PROXY_HEADER, PROXY_DATA }) => {
      const headers = normalizeItems(PROXY_HEADER?.item);
      const data = normalizeItems(PROXY_DATA?.item);
      return {
        name: (headers[0]?.OBJ_NAME ?? '').toUpperCase(),
        headers: headers.map((h) => ({
          object: h.OBJECT,
          objName: h.OBJ_NAME,
          ifrType: h.IFR_TYPE,
          ifrName: h.IFR_NAME,
          ifrNspce: h.IFR_NSPCE,
        })),
        data: data.map((d) => ({
          object: d.OBJECT,
          objName: d.OBJ_NAME,
          ifrType: d.IFR_TYPE,
          ifrName: d.IFR_NAME,
          ifrText: d.IFR_TEXT,
          r3Type: d.R3_TYPE,
          r3Name: d.R3_NAME,
        })),
      };
    },
  },
);
