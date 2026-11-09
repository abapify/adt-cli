/**
 * HTTP (HTTP Service) object handler for abapGit format
 *
 * HTTP services are XML-only (no source code). The abapGit format stores
 * the service ID in HTTPID, description in HTTPTEXT, and handler
 * configuration in HTTPHDL (UCON framework).
 */

import { http } from '../../../schemas/generated';
import { createHandler, unwrapData } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';

type HttpServiceLike = {
  name: string;
  description?: string;
  language?: string;
  masterLanguage?: string;
  handlerClass?: string;
  serviceOrder?: string;
  handlers?: Array<{ handler?: string; serviceOrder?: string }>;
};

export const httpServiceHandler = createHandler<HttpServiceLike, typeof http>(
  'HTTP',
  {
    schema: http,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_HTTP',
    serializer_version: 'v1.0.0',

    toAbapGit: (raw) => {
      const obj = unwrapData<HttpServiceLike>(raw);

      const name = String(obj.name ?? '').toUpperCase();
      const lang = isoToSapLang((obj as any).masterLanguage || (obj as any).language);
      const handlerClassFallback = obj.handlerClass
        ? {
            UCONSERVHANDLER: {
              ID: name,
              VERSION: 'A',
              SERVICEORDER: obj.serviceOrder ?? '01',
              SERVICEHANDLER: obj.handlerClass,
            },
          }
        : undefined;
      return {
        HTTPID: name,
        HTTPTEXT: {
          ID: name,
          VERSION: 'A',
          LANG: lang,
          SHORTTEXT: (obj as any).description ?? '',
        },
        HTTPHDL: obj.handlers?.length
          ? {
              UCONSERVHANDLER: obj.handlers.map((h, i) => ({
                ID: name,
                VERSION: 'A',
                SERVICEORDER: h.serviceOrder ?? String(i + 1).padStart(2, '0'),
                SERVICEHANDLER: h.handler,
              })),
            }
          : handlerClassFallback,
      };
    },

    fromAbapGit: ({ HTTPID, HTTPTEXT, HTTPHDL }) => {
      const handler = HTTPHDL?.UCONSERVHANDLER;
      const handlerList = Array.isArray(handler) ? handler : [handler];
      const items = handler ? handlerList : [];
      const firstHandler = items[0];
      return {
        name: (HTTPID ?? HTTPTEXT?.ID ?? '').toUpperCase(),
        description: HTTPTEXT?.SHORTTEXT,
        language: sapLangToIso(HTTPTEXT?.LANG),
        masterLanguage: sapLangToIso(HTTPTEXT?.LANG),
        handlerClass: firstHandler?.SERVICEHANDLER,
        serviceOrder: firstHandler?.SERVICEORDER,
        handlers: items.map((h: any) => ({
          handler: h.SERVICEHANDLER,
          serviceOrder: h.SERVICEORDER,
        })),
      };
    },
  },
);
