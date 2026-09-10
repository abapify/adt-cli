/**
 * HTTP (HTTP Service) object handler for abapGit format
 *
 * HTTP services are XML-only (no source code). The abapGit format stores
 * the service ID in HTTPID, description in HTTPTEXT, and handler
 * configuration in HTTPHDL (UCON framework).
 */

import { http } from '../../../schemas/generated';
import { createHandler } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';

type HttpServiceLike = {
  name: string;
  description?: string;
  language?: string;
  masterLanguage?: string;
  handlerClass?: string;
  serviceOrder?: string;
};

export const httpServiceHandler = createHandler<HttpServiceLike, typeof http>(
  'HTTP',
  {
    schema: http,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_HTTP',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => {
      const name = String(obj.name ?? '').toUpperCase();
      const lang = isoToSapLang(obj.masterLanguage || obj.language);
      return {
        HTTPID: name,
        HTTPTEXT: {
          ID: name,
          VERSION: 'A',
          LANG: lang,
          SHORTTEXT: obj.description ?? '',
        },
        HTTPHDL: obj.handlerClass
          ? {
              UCONSERVHANDLER: {
                ID: name,
                VERSION: 'A',
                SERVICEORDER: obj.serviceOrder ?? '01',
                SERVICEHANDLER: obj.handlerClass,
              },
            }
          : undefined,
      };
    },

    fromAbapGit: ({ HTTPID, HTTPTEXT, HTTPHDL }) => {
      const handler = HTTPHDL?.UCONSERVHANDLER;
      const items = handler
        ? Array.isArray(handler)
          ? handler
          : [handler]
        : [];
      const firstHandler = items[0];
      return {
        name: (HTTPID ?? HTTPTEXT?.ID ?? '').toUpperCase(),
        description: HTTPTEXT?.SHORTTEXT,
        language: sapLangToIso(HTTPTEXT?.LANG),
        masterLanguage: sapLangToIso(HTTPTEXT?.LANG),
        handlerClass: firstHandler?.SERVICEHANDLER,
        serviceOrder: firstHandler?.SERVICEORDER,
      };
    },
  },
);
