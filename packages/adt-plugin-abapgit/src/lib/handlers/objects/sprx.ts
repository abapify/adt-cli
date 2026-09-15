/**
 * SPRX (Proxy Object) handler for abapGit format
 */

import { sprx } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';

type ProxyObjectLike = {
  name: string;
  headers?: Array<{
    object?: string;
    objName?: string;
    inactive?: string;
    ifrType?: string;
    ifrName?: string;
    ifrNspce?: string;
    ifrGnspce?: string;
  }>;
  data?: Array<{
    object?: string;
    objName?: string;
    object1?: string;
    objName1?: string;
    inactive?: string;
    ifrType?: string;
    ifrName?: string;
    ifrText?: string;
    r3Type?: string;
    r3Name?: string;
  }>;
};

export const proxyObjectHandler = createHandler<ProxyObjectLike, typeof sprx>(
  'SPRX',
  {
    schema: sprx,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SPRX',
    serializer_version: 'v1.0.0',

    toAbapGit: (raw) => {
      const obj = unwrapData<ProxyObjectLike>(raw);
      return {
        PROXY_HEADER: obj.headers?.length
          ? {
              item: obj.headers.map((h) => ({
                OBJECT: h.object,
                OBJ_NAME: h.objName,
                INACTIVE: h.inactive,
                IFR_TYPE: h.ifrType,
                IFR_NAME: h.ifrName,
                IFR_NSPCE: h.ifrNspce,
                IFR_GNSPCE: h.ifrGnspce,
              })),
            }
          : undefined,
        PROXY_DATA: obj.data?.length
          ? {
              item: obj.data.map((d) => ({
                OBJECT: d.object,
                OBJ_NAME: d.objName,
                OBJECT1: d.object1,
                OBJ_NAME1: d.objName1,
                INACTIVE: d.inactive,
                IFR_TYPE: d.ifrType,
                IFR_NAME: d.ifrName,
                IFR_TEXT: d.ifrText,
                R3_TYPE: d.r3Type,
                R3_NAME: d.r3Name,
              })),
            }
          : undefined,
      };
    },

    fromAbapGit: ({ PROXY_HEADER, PROXY_DATA }) => {
      const headers = normalizeItems(PROXY_HEADER?.item);
      const data = normalizeItems(PROXY_DATA?.item);
      return {
        name: (headers[0]?.OBJ_NAME ?? '').toUpperCase(),
        headers: mapItems(headers, (h) => ({
          object: h.OBJECT,
          objName: h.OBJ_NAME,
          inactive: h.INACTIVE,
          ifrType: h.IFR_TYPE,
          ifrName: h.IFR_NAME,
          ifrNspce: h.IFR_NSPCE,
          ifrGnspce: h.IFR_GNSPCE,
        })),
        data: mapItems(data, (d) => ({
          object: d.OBJECT,
          objName: d.OBJ_NAME,
          object1: d.OBJECT1,
          objName1: d.OBJ_NAME1,
          inactive: d.INACTIVE,
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
