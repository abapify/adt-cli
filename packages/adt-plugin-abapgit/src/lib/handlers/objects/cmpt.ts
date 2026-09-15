/**
 * CMPT (Composite Template) handler for abapGit format
 *
 * Upstream serializes the full IF_CMP_TEMPLATE_DB=>TYP_TEMPLATE
 * structure under CMPT — HEADER plus body fields (STR_BODY etc.)
 * that pass through lax.
 */

import { cmpt } from '../../../schemas/generated';
import { createHandler, unwrapData } from '../base';

type CompositeTemplateLike = {
  name: string;
  description?: string;
  /** Additional CMPT children (STR_BODY etc.) preserved verbatim */
  extra?: Record<string, unknown>;
};

export const compositeTemplateHandler = createHandler<
  CompositeTemplateLike,
  typeof cmpt
>('CMPT', {
  schema: cmpt,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_CMPT',
  serializer_version: 'v1.0.0',

  toAbapGit: (raw) => {
    const obj = unwrapData<CompositeTemplateLike>(raw);
    return {
      CMPT: {
        HEADER: {
          NAME: String(obj.name ?? '').toUpperCase(),
          DESCRIPTION: obj.description,
        },
        ...(obj.extra ?? {}),
      },
    };
  },

  fromAbapGit: ({ CMPT }) => {
    const { HEADER, ...rest } = CMPT ?? {};
    return {
      name: (HEADER?.NAME ?? '').toUpperCase(),
      description: HEADER?.DESCRIPTION,
      extra: rest,
    };
  },
});
