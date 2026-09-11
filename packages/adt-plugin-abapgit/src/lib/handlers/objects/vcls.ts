/**
 * VCLS (View Cluster) handler for abapGit format
 */

import { vcls } from '../../../schemas/generated';
import { createHandler } from '../base';

type ViewClusterLike = {
  name: string;
  author?: string;
  changedDate?: string;
  structures?: Array<{ object?: string; objText?: string }>;
  maintenanceForms?: Array<{ object?: string; form?: string }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const viewClusterHandler = createHandler<ViewClusterLike, typeof vcls>(
  'VCLS',
  {
    schema: vcls,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_VCLS',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      VCLDIR: {
        VCLNAME: String(obj.name ?? '').toUpperCase(),
        AUTHOR: obj.author,
        CHANGEDATE: obj.changedDate,
      },
      VLCSTRUC_TAB: obj.structures?.length
        ? { item: obj.structures.map((s) => ({
            VCLNAME: String(obj.name ?? '').toUpperCase(),
            OBJECT: s.object,
            OBJTEXT: s.objText,
          })) }
        : undefined,
      VCLMF_TAB: obj.maintenanceForms?.length
        ? { item: obj.maintenanceForms.map((m) => ({
            VCLNAME: String(obj.name ?? '').toUpperCase(),
            OBJECT: m.object,
            FORM: m.form,
          })) }
        : undefined,
    }),

    fromAbapGit: ({ VCLDIR, VLCSTRUC_TAB, VCLMF_TAB }) => {
      const structures = normalizeItems(VLCSTRUC_TAB?.item);
      const forms = normalizeItems(VCLMF_TAB?.item);
      return {
        name: (VCLDIR?.VCLNAME ?? '').toUpperCase(),
        author: VCLDIR?.AUTHOR,
        changedDate: VCLDIR?.CHANGEDATE,
        structures: structures.map((s) => ({ object: s.OBJECT, objText: s.OBJTEXT })),
        maintenanceForms: forms.map((m) => ({ object: m.OBJECT, form: m.FORM })),
      };
    },
  },
);
