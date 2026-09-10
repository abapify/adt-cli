/**
 * NROB (Number Range Object) handler for abapGit format
 *
 * Number range objects are XML-only (no source code). The abapGit format
 * stores attributes (object, domain, buffering), text, and intervals.
 */

import { nrob } from '../../../schemas/generated';
import { createHandler } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';

type NumberRangeObjectLike = {
  name: string;
  description?: string;
  shortText?: string;
  language?: string;
  masterLanguage?: string;
  domainLength?: string;
  percentage?: string;
  buffer?: boolean;
  noivbuffer?: string;
  intervals?: Array<{
    number?: string;
    from?: string;
    to?: string;
    level?: string;
    procIndicator?: string;
  }>;
};

export const numberRangeObjectHandler = createHandler<
  NumberRangeObjectLike,
  typeof nrob
>('NROB', {
  schema: nrob,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_NROB',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => {
    const name = String(obj.name ?? '').toUpperCase();
    return {
      ATTRIBUTES: {
        OBJECT: name,
        DOMLEN: obj.domainLength,
        PERCENTAGE: obj.percentage,
        BUFFER: obj.buffer ? 'X' : undefined,
        NOIVBUFFER: obj.noivbuffer,
      },
      TEXT: {
        LANGU: isoToSapLang(obj.masterLanguage || obj.language),
        OBJECT: name,
        TXT: obj.description ?? '',
        TXTSHORT: obj.shortText ?? '',
      },
      INTERVALS: obj.intervals?.length
        ? {
            item: obj.intervals.map((i) => ({
              NRNR: i.number,
              FROM: i.from,
              TO: i.to,
              NRLVL: i.level,
              PROCIND: i.procIndicator,
            })),
          }
        : undefined,
    };
  },

  fromAbapGit: ({ ATTRIBUTES, TEXT, INTERVALS }) => {
    const items = INTERVALS?.item
      ? Array.isArray(INTERVALS.item)
        ? INTERVALS.item
        : [INTERVALS.item]
      : [];
    return {
      name: (ATTRIBUTES?.OBJECT ?? '').toUpperCase(),
      description: TEXT?.TXT,
      shortText: TEXT?.TXTSHORT,
      language: sapLangToIso(TEXT?.LANGU),
      masterLanguage: sapLangToIso(TEXT?.LANGU),
      domainLength: ATTRIBUTES?.DOMLEN,
      percentage: ATTRIBUTES?.PERCENTAGE,
      buffer: ATTRIBUTES?.BUFFER === 'X',
      noivbuffer: ATTRIBUTES?.NOIVBUFFER,
      intervals: items.map((i) => ({
        number: i.NRNR,
        from: i.FROM,
        to: i.TO,
        level: i.NRLVL,
        procIndicator: i.PROCIND,
      })),
    };
  },
});
