/**
 * WDYA (Web Dynpro Application) handler for abapGit format
 */

import { wdya } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';

type WdyaLike = {
  name: string;
  component?: string;
  interface?: string;
  description?: string;
  properties?: Array<{ name?: string; value?: string }>;
};

export const webDynproAppHandler = createHandler<WdyaLike, typeof wdya>(
  'WDYA',
  {
    schema: wdya,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_WDYA',
    serializer_version: 'v1.0.0',

    toAbapGit: (raw) => {
      const obj = unwrapData<WdyaLike>(raw);
      return {
        APP: {
          APPLICATION_NAME: String(obj.name ?? '').toUpperCase(),
          COMPONENT: obj.component,
          INTERFACE: obj.interface,
          DESCRIPTION: obj.description,
        },
        PROPERTIES: obj.properties?.length
          ? {
              item: obj.properties.map((p) => ({
                NAME: p.name,
                VALUE: p.value,
              })),
            }
          : undefined,
      };
    },

    fromAbapGit: ({ APP, PROPERTIES }) => {
      const props = normalizeItems(PROPERTIES?.item);
      return {
        name: (APP?.APPLICATION_NAME ?? '').toUpperCase(),
        component: APP?.COMPONENT,
        interface: APP?.INTERFACE,
        description: APP?.DESCRIPTION,
        properties: mapItems(props, (p) => ({ name: p.NAME, value: p.VALUE })),
      };
    },
  },
);
