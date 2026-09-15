/**
 * PINF (Package Interface) handler for abapGit format
 */

import { pinf } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';

type PackageInterfaceLike = {
  name: string;
  packageName?: string;
  description?: string;
  elements?: Array<{ elementName?: string; elementType?: string }>;
};

export const packageInterfaceHandler = createHandler<
  PackageInterfaceLike,
  typeof pinf
>('PINF', {
  schema: pinf,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_PINF',
  serializer_version: 'v1.0.0',

  toAbapGit: (raw) => {
    const obj = unwrapData<PackageInterfaceLike>(raw);
    const name = String(obj.name ?? '').toUpperCase();
    return {
      PINF: {
        ATTRIBUTES: {
          PACK_NAME: obj.packageName,
          INTF_NAME: name,
          DESCR: obj.description,
        },
        ELEMENTS: obj.elements?.length
          ? {
              item: obj.elements.map((e) => ({
                PACK_NAME: obj.packageName,
                INTF_NAME: name,
                ELEMENT_NAME: e.elementName,
                ELEMENT_TYPE: e.elementType,
              })),
            }
          : undefined,
      },
    };
  },

  fromAbapGit: ({ PINF }) => {
    const elements = normalizeItems(PINF?.ELEMENTS?.item);
    return {
      name: (PINF?.ATTRIBUTES?.INTF_NAME ?? '').toUpperCase(),
      packageName: PINF?.ATTRIBUTES?.PACK_NAME,
      description: PINF?.ATTRIBUTES?.DESCR,
      elements: mapItems(elements, (e) => ({
        elementName: e.ELEMENT_NAME,
        elementType: e.ELEMENT_TYPE,
      })),
    };
  },
});
