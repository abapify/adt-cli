/**
 * VCLS (View Cluster) handler for abapGit format
 */

import { vcls } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';

type ViewClusterLike = {
  name: string;
  author?: string;
  changedDate?: string;
  structures?: Array<{ object?: string; objText?: string }>;
  maintenanceForms?: Array<{ object?: string; form?: string }>;
};

export const viewClusterHandler = createHandler<ViewClusterLike, typeof vcls>(
  'VCLS',
  {
    schema: vcls,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_VCLS',
    serializer_version: 'v1.0.0',

    toAbapGit: (raw) => {
      const obj = unwrapData<ViewClusterLike>(raw);
      return {
        VCLDIR: {
          VCLNAME: String(obj.name ?? '').toUpperCase(),
          AUTHOR: obj.author,
          CHANGEDATE: obj.changedDate,
        },
        VCLSTRUC_TAB: obj.structures?.length
          ? {
              item: obj.structures.map((s) => ({
                VCLNAME: String(obj.name ?? '').toUpperCase(),
                OBJECT: s.object,
                OBJTEXT: s.objText,
              })),
            }
          : undefined,
        VCLMF_TAB: obj.maintenanceForms?.length
          ? {
              item: obj.maintenanceForms.map((m) => ({
                VCLNAME: String(obj.name ?? '').toUpperCase(),
                OBJECT: m.object,
                FORM: m.form,
              })),
            }
          : undefined,
      };
    },

    fromAbapGit: ({ VCLDIR, VCLSTRUC_TAB, VCLMF_TAB }) => {
      const structures = normalizeItems(VCLSTRUC_TAB?.item);
      const forms = normalizeItems(VCLMF_TAB?.item);
      return {
        name: (VCLDIR?.VCLNAME ?? '').toUpperCase(),
        author: VCLDIR?.AUTHOR,
        changedDate: VCLDIR?.CHANGEDATE,
        structures: mapItems(structures, (s) => ({
          object: s.OBJECT,
          objText: s.OBJTEXT,
        })),
        maintenanceForms: mapItems(forms, (m) => ({
          object: m.OBJECT,
          form: m.FORM,
        })),
      };
    },
  },
);
