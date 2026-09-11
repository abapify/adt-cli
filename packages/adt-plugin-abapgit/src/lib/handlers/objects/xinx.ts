/**
 * XINX (Extension Index) handler for abapGit format
 */

import { xinx } from '../../../schemas/generated';
import { createHandler } from '../base';

type ExtensionIndexLike = {
  name: string;
  tableName?: string;
  indexName?: string;
  description?: string;
  unique?: boolean;
  fields?: Array<{ position?: string; fieldName?: string }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const extensionIndexHandler = createHandler<ExtensionIndexLike, typeof xinx>(
  'XINX',
  {
    schema: xinx,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_XINX',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      XINX: {
        DD12V: {
          SQLTAB: obj.tableName,
          INDEXNAME: obj.indexName,
          DDTEXT: obj.description,
          UNIQUEFLAG: obj.unique ? 'X' : undefined,
        },
        T_DD17V: obj.fields?.length
          ? { DD17V: obj.fields.map((f) => ({ POSITION: f.position, FIELDNAME: f.fieldName })) }
          : undefined,
      },
    }),

    fromAbapGit: ({ XINX }) => {
      const dd17v = normalizeItems(XINX?.T_DD17V?.DD17V);
      return {
        name: (XINX?.DD12V?.INDEXNAME ?? '').toUpperCase(),
        tableName: XINX?.DD12V?.SQLTAB,
        indexName: XINX?.DD12V?.INDEXNAME,
        description: XINX?.DD12V?.DDTEXT,
        unique: XINX?.DD12V?.UNIQUEFLAG === 'X',
        fields: dd17v.map((f) => ({ position: f.POSITION, fieldName: f.FIELDNAME })),
      };
    },
  },
);
