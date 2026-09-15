/**
 * SICF (ICF Service) handler for abapGit format
 *
 * ICF services are XML-only. The abapGit format stores the service URL,
 * ICF service metadata, documentation, handler table, and OTR texts.
 */

import { sicf } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type SicfOtrText = {
  concept?: string;
  paket?: string;
  creaLan?: string;
  aliasName?: string;
  entries?: Array<{
    langu?: string;
    object?: string;
    lfdNum?: string;
    text?: string;
  }>;
};

type IcfServiceLike = {
  name: string;
  description?: string;
  url?: string;
  language?: string;
  handlerClass?: string;
  handlers?: Array<{ handler?: string; order?: string }>;
  parent?: string;
  auth?: string;
  otrTexts?: SicfOtrText[];
  otrUses?: Array<{
    pgmid?: string;
    object?: string;
    objName?: string;
    concept?: string;
    lfdNum?: string;
  }>;
};

export const icfServiceHandler = createHandler<IcfServiceLike, typeof sicf>(
  'SICF',
  {
    schema: sicf,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SICF',
    serializer_version: 'v1.0.0',

    toAbapGit: (raw) => {
      const obj = unwrapData<IcfServiceLike>(raw);
      const name = String(obj.name ?? '').toUpperCase();
      const lang = isoToSapLang(obj.language);
      const handlers = obj.handlers?.length
        ? obj.handlers
        : obj.handlerClass
          ? [{ handler: obj.handlerClass }]
          : [];
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
        ICFHANDLER_TABLE: handlers.length
          ? {
              ICFHANDLER: handlers.map((h, i) => ({
                ICF_NAME: name,
                ICFHANDLER: h.handler,
                ICFHANDLERORDER: h.order ?? String(i + 1),
              })),
            }
          : undefined,
        SOTS: obj.otrTexts?.length
          ? {
              item: obj.otrTexts.map((t) => ({
                HEADER: {
                  CONCEPT: t.concept,
                  PAKET: t.paket,
                  CREA_LAN: t.creaLan,
                  ALIAS_NAME: t.aliasName,
                },
                ENTRIES: t.entries?.length
                  ? {
                      item: t.entries.map((e) => ({
                        CONCEPT: t.concept,
                        LANGU: e.langu,
                        OBJECT: e.object,
                        LFD_NUM: e.lfdNum,
                        TEXT: e.text,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
        SOTS_USE: obj.otrUses?.length
          ? {
              item: obj.otrUses.map((u) => ({
                PGMID: u.pgmid,
                OBJECT: u.object,
                OBJ_NAME: u.objName ?? name,
                CONCEPT: u.concept,
                LFD_NUM: u.lfdNum,
              })),
            }
          : undefined,
      };
    },

    fromAbapGit: ({
      URL,
      ICFSERVICE,
      ICFDOCU,
      ICFHANDLER_TABLE,
      SOTS,
      SOTS_USE,
    }) => {
      const handlers = normalizeItems(ICFHANDLER_TABLE?.ICFHANDLER);
      const otrTexts = normalizeItems(SOTS?.item);
      const otrUses = normalizeItems(SOTS_USE?.item);
      return {
        name: (ICFSERVICE?.ICF_NAME ?? '').toUpperCase(),
        description: ICFDOCU?.DESCRIPT,
        url: URL,
        language: sapLangToIso(ICFDOCU?.LANGU),
        handlerClass: handlers[0]?.ICFHANDLER,
        handlers: mapItems(handlers, (h) => ({
          handler: h.ICFHANDLER,
          order: h.ICFHANDLERORDER,
        })),
        parent: ICFSERVICE?.ICF_PARENT,
        auth: ICFSERVICE?.ICF_AUTH,
        otrTexts: mapItems(otrTexts, (t) => ({
          concept: t.HEADER?.CONCEPT,
          paket: t.HEADER?.PAKET,
          creaLan: t.HEADER?.CREA_LAN,
          aliasName: t.HEADER?.ALIAS_NAME,
          entries: normalizeItems(t.ENTRIES?.item).map((e) => ({
            langu: e.LANGU,
            object: e.OBJECT,
            lfdNum: e.LFD_NUM,
            text: e.TEXT,
          })),
        })),
        otrUses: mapItems(otrUses, (u) => ({
          pgmid: u.PGMID,
          object: u.OBJECT,
          objName: u.OBJ_NAME,
          concept: u.CONCEPT,
          lfdNum: u.LFD_NUM,
        })),
      };
    },
  },
);
