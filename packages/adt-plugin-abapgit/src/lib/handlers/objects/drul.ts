/**
 * DRUL (Derivation Rule) handler for abapGit format
 *
 * Upstream stores the rule source in a {name}.drul.asdrul side file;
 * this handler covers the DRUL metadata XML.
 */

import { drul } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type DerivationRuleLike = {
  name: string;
  masterLanguage?: string;
  responsible?: string;
  packageName?: string;
};

export const derivationRuleHandler = createHandler<
  DerivationRuleLike,
  typeof drul
>('DRUL', {
  schema: drul,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_DRUL',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    DRUL: {
      METADATA: {
        NAME: String(obj.name ?? '').toUpperCase(),
        MASTER_LANGUAGE: isoToSapLang(obj.masterLanguage),
        RESPONSIBLE: obj.responsible,
        PACKAGE_REF: obj.packageName,
      },
    },
  }),

  fromAbapGit: ({ DRUL }) => ({
    name: (DRUL?.METADATA?.NAME ?? '').toUpperCase(),
    masterLanguage: sapLangToIso(DRUL?.METADATA?.MASTER_LANGUAGE),
    responsible: DRUL?.METADATA?.RESPONSIBLE,
    packageName: DRUL?.METADATA?.PACKAGE_REF,
  }),
});
