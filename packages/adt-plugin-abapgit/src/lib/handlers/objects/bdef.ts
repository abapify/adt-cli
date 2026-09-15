/**
 * BDEF (RAP Behavior Definition) object handler for abapGit format
 *
 * BDEF is source-driven: the semantic content lives in an `.abdl` file.
 * Supports BOTH formats:
 *   - AFF (default): `.bdef.abdl` source + `.bdef.json` metadata sidecar
 *   - Legacy XML:    `.bdef.abdl` source + `.bdef.xml` metadata
 *
 * File layout (AFF):
 *   src/zbp_foo.bdef.abdl — behavior source text
 *   src/zbp_foo.bdef.json — ABAP File Formats metadata
 *
 * File layout (legacy):
 *   src/zbp_foo.bdef.abdl — behavior source text
 *   src/zbp_foo.bdef.xml  — legacy abapGit XML metadata
 */

import { bdef } from '../../../schemas/generated';
import { createHandler } from '../base';
import {
  serializeDualFormat,
  affGetSource,
  affFromAbapGit,
  affSetSources,
  affFromAffJson,
} from '../source-resolver';
import type { FormatSerializeOptions } from '@abapify/adt-plugin';

type BdefLike = {
  name: string;
  description?: string;
  originalLanguage?: string;
  abapLanguageVersion?: string;
  getSource?: () => Promise<string> | string;
};

export const behaviorDefinitionHandler = createHandler<BdefLike, typeof bdef>(
  'BDEF',
  {
    schema: bdef,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_BDEF',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      SKEY: {
        TYPE: 'BDEF',
        NAME: String(obj?.name ?? '').toUpperCase(),
      },
    }),

    getSource: affGetSource,
    fromAbapGit: ({ SKEY }) => affFromAbapGit(SKEY),
    fromAffJson: (json) => affFromAffJson(json, ''),

    serialize: (object, ctx, options?: FormatSerializeOptions) =>
      serializeDualFormat(object, ctx, options, {
        typeLabel: 'BDEF',
        sourceExt: 'abdl',
        jsonExt: `${ctx.fileExtension}.json`,
      }),

    setSources: affSetSources,
  },
);
