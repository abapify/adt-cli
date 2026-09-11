/**
 * CHAR (Characteristic) handler for abapGit format
 */

import { char } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type CharacteristicLike = {
  name: string;
  className?: string;
  format?: string;
  values?: string;
  texts?: Array<{ language?: string; className?: string; description?: string }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const characteristicHandler = createHandler<CharacteristicLike, typeof char>(
  'CHAR',
  {
    schema: char,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_CHAR',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      CHAR: {
        CLS_ATTRIBUTE: {
          CLSNAME: obj.className,
          ATNAM: String(obj.name ?? '').toUpperCase(),
          ATFOR: obj.format,
          ATVOR: obj.values,
        },
        CLS_ATTRIBUTET: obj.texts?.length
          ? { item: obj.texts.map((t) => ({
              SPRAS: isoToSapLang(t.language),
              CLSNAME: t.className ?? obj.className,
              ATBEZ: t.description,
            })) }
          : undefined,
      },
    }),

    fromAbapGit: ({ CHAR }) => {
      const texts = normalizeItems(CHAR?.CLS_ATTRIBUTET?.item);
      return {
        name: (CHAR?.CLS_ATTRIBUTE?.ATNAM ?? '').toUpperCase(),
        className: CHAR?.CLS_ATTRIBUTE?.CLSNAME,
        format: CHAR?.CLS_ATTRIBUTE?.ATFOR,
        values: CHAR?.CLS_ATTRIBUTE?.ATVOR,
        texts: texts.map((t) => ({
          language: sapLangToIso(t.SPRAS),
          className: t.CLSNAME,
          description: t.ATBEZ,
        })),
      };
    },
  },
);
