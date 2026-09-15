/**
 * UDMO (Data Model) handler for abapGit format
 */

import { udmo } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type DataModelLike = {
  name: string;
  as4local?: string;
  dmoType?: string;
  entities?: Array<{ entId?: string; as4local?: string }>;
  texts?: Array<{ language?: string; longText?: string; as4local?: string }>;
};

export const dataModelHandler = createHandler<DataModelLike, typeof udmo>(
  'UDMO',
  {
    schema: udmo,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_UDMO',
    serializer_version: 'v1.0.0',

    toAbapGit: (raw) => {
      const obj = unwrapData<DataModelLike>(raw);
      return {
        DM40L: {
          DMOID: String(obj.name ?? '').toUpperCase(),
          AS4LOCAL: obj.as4local,
          DMOTYPE: obj.dmoType,
        },
        UDMO_ENTITIES: obj.entities?.length
          ? {
              item: obj.entities.map((e) => ({
                DMOID: String(obj.name ?? '').toUpperCase(),
                ENTID: e.entId,
                AS4LOCAL: e.as4local,
              })),
            }
          : undefined,
        UDMO_TEXTS: obj.texts?.length
          ? {
              item: obj.texts.map((t) => ({
                SPRACHE: isoToSapLang(t.language),
                DMOID: String(obj.name ?? '').toUpperCase(),
                LANGBEZ: t.longText,
                AS4LOCAL: t.as4local,
              })),
            }
          : undefined,
      };
    },

    fromAbapGit: ({ DM40L, UDMO_ENTITIES, UDMO_TEXTS }) => {
      const entities = normalizeItems(UDMO_ENTITIES?.item);
      const texts = normalizeItems(UDMO_TEXTS?.item);
      return {
        name: (DM40L?.DMOID ?? '').toUpperCase(),
        as4local: DM40L?.AS4LOCAL,
        dmoType: DM40L?.DMOTYPE,
        entities: mapItems(entities, (e) => ({
          entId: e.ENTID,
          as4local: e.AS4LOCAL,
        })),
        texts: mapItems(texts, (t) => ({
          language: sapLangToIso(t.SPRACHE),
          longText: t.LANGBEZ,
          as4local: t.AS4LOCAL,
        })),
      };
    },
  },
);
