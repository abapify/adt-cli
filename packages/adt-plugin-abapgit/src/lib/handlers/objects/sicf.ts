/**
 * SICF (ICF Service) handler for abapGit format
 *
 * ICF services are XML-only. The abapGit format stores the service URL,
 * ICF service metadata, documentation, handler table, and OTR texts.
 */

import { sicf } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type IcfServiceLike = {
  name: string;
  description?: string;
  url?: string;
  language?: string;
  handlerClass?: string;
  parent?: string;
  auth?: string;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const icfServiceHandler = createHandler<IcfServiceLike, typeof sicf>(
  'SICF',
  {
    schema: sicf,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SICF',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => {
      const name = String(obj.name ?? '').toUpperCase();
      const lang = isoToSapLang(obj.language);
      return {
        URL: obj.url ?? '',
        ICFSERVICE: {
          ICF_NAME: name,
          ICFALTNME: name,
          ORIG_NAME: name,
          ICF_PARENT: obj.parent,
          ICF_AUTH: obj.auth,
        },
        ICFDOCU: {
          ICF_NAME: name,
          LANGU: lang,
          DESCRIPT: obj.description ?? '',
        },
        ICFHANDLER_TABLE: obj.handlerClass
          ? {
              ICFHANDLER: {
                ICF_NAME: name,
                ICFHANDLER: obj.handlerClass,
              },
            }
          : undefined,
      };
    },

    fromAbapGit: ({ URL, ICFSERVICE, ICFDOCU, ICFHANDLER_TABLE }) => {
      const handlers = normalizeItems(ICFHANDLER_TABLE?.ICFHANDLER);
      return {
        name: (ICFSERVICE?.ICF_NAME ?? '').toUpperCase(),
        description: ICFDOCU?.DESCRIPT,
        url: URL,
        language: sapLangToIso(ICFDOCU?.LANGU),
        handlerClass: handlers[0]?.ICFHANDLER,
        parent: ICFSERVICE?.ICF_PARENT,
        auth: ICFSERVICE?.ICF_AUTH,
      };
    },
  },
);
