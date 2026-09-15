/**
 * Shared ODS metadata mapping for SOD1/SOD2 handlers
 *
 * Both types serialize an identical {TYPE}.METADATA structure;
 * the only difference is the object type and generated schema.
 */

import { createHandler, unwrapData } from '../base';
import type { AbapGitSchema } from '../abapgit-schema';
import { sapLangToIso, isoToSapLang } from '../lang';

type OdsObjectLike = {
  name: string;
  masterLanguage?: string;
};

type OdsValues = Record<
  string,
  { METADATA?: { NAME?: string; MASTER_LANGUAGE?: string } } | undefined
>;

export function createOdsHandler<
  TSchema extends AbapGitSchema<unknown, OdsValues>,
>(type: string, schema: TSchema) {
  return createHandler<OdsObjectLike, TSchema>(type, {
    schema,
    version: 'v1.0.0',
    serializer: `LCL_OBJECT_${type}`,
    serializer_version: 'v1.0.0',

    toAbapGit: (raw) => {
      const obj = unwrapData<OdsObjectLike>(raw);
      return {
        [type]: {
          METADATA: {
            NAME: String(obj.name ?? '').toUpperCase(),
            MASTER_LANGUAGE: isoToSapLang(obj.masterLanguage),
          },
        },
      };
    },

    fromAbapGit: (values) => {
      const node = values[type];
      return {
        name: (node?.METADATA?.NAME ?? '').toUpperCase(),
        masterLanguage: sapLangToIso(node?.METADATA?.MASTER_LANGUAGE),
      };
    },
  });
}
