/**
 * SRVD (RAP Service Definition) object handler for abapGit format
 *
 * SRVD is source-driven: the semantic content lives in an `.acds` file.
 * Supports BOTH formats:
 *   - AFF (default): `.srvd.acds` source + `.srvd.json` metadata sidecar
 *   - Legacy XML:    `.srvd.acds` source + `.srvd.xml` metadata
 *
 * File layout (AFF):
 *   src/zui_foo.srvd.acds — service source text
 *   src/zui_foo.srvd.json — ABAP File Formats metadata
 *
 * File layout (legacy):
 *   src/zui_foo.srvd.acds — service source text
 *   src/zui_foo.srvd.xml  — legacy abapGit XML metadata
 */

import { srvd } from '../../../schemas/generated';
import { createHandler } from '../base';
import {
  serializeDualFormat,
  affGetSource,
  affFromAbapGit,
  affSetSources,
  affFromAffJson,
} from '../source-resolver';
import type { FormatSerializeOptions } from '@abapify/adt-plugin';

type SrvdLike = {
  name: string;
  description?: string;
  originalLanguage?: string;
  abapLanguageVersion?: string;
  sourceOrigin?: string;
  sourceType?: string;
  getSource?: () => Promise<string> | string;
};

export const serviceDefinitionHandler = createHandler<SrvdLike, typeof srvd>(
  'SRVD',
  {
    schema: srvd,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SRVD',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      SKEY: {
        TYPE: 'SRVD',
        NAME: String(obj?.name ?? '').toUpperCase(),
      },
    }),

    getSource: affGetSource,
    fromAbapGit: ({ SKEY }) => affFromAbapGit(SKEY),
    fromAffJson: (json) => ({
      ...affFromAffJson(json, ''),
      // Preserve SRVD-specific metadata for round-trip
      sourceOrigin: (json as { generalInformation?: { sourceOrigin?: string } })
        ?.generalInformation?.sourceOrigin,
      sourceType: (json as { generalInformation?: { sourceType?: string } })
        ?.generalInformation?.sourceType,
    }),

    serialize: (object, ctx, options?: FormatSerializeOptions) =>
      serializeDualFormat(object, ctx, options, {
        typeLabel: 'SRVD',
        sourceExt: 'acds',
        jsonExt: `${ctx.fileExtension}.json`,
        extra: {
          generalInformation: {
            sourceOrigin: object.sourceOrigin ?? 'abapDevelopmentTools',
            sourceType: object.sourceType ?? 'definition',
          },
        },
      }),

    setSources: affSetSources,
  },
);
