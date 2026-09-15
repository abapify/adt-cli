import { bdef } from '../../../schemas/generated';
import { createHandler, type AbapGitSchema } from '../base';
import {
  serializeDualFormat,
  affGetSource,
  affFromAbapGit,
  affSetSources,
  affFromAffJson,
} from '../source-resolver';
import type { FormatSerializeOptions } from '@abapify/adt-plugin';

type CdsAffSourceObject = {
  name: string;
  description?: string;
  originalLanguage?: string;
  abapLanguageVersion?: string;
  getSource?: () => Promise<string> | string;
};

type CdsAffSourceOptions = {
  /** Override the default bdef schema (for types with their own XSD) */
  schema?: AbapGitSchema;
  /** Extra AFF fields to include in fromAffJson (e.g. sourceOrigin, sourceType) */
  fromAffJsonExtra?: (json: Record<string, unknown>) => Record<string, unknown>;
  /** Extra fields to pass to serializeDualFormat, computed from the object */
  serializeExtra?: (
    object: CdsAffSourceObject & Record<string, unknown>,
  ) => Record<string, unknown>;
};

/** Create the shared dual-format source-and-metadata layout used by CDS source types.
 * Supports both AFF JSON (default) and legacy abapGit XML metadata. */
export function createCdsAffSourceHandler(
  type: string,
  options?: CdsAffSourceOptions,
) {
  const schema = options?.schema ?? bdef;
  return createHandler<CdsAffSourceObject, typeof schema>(type, {
    schema,
    version: 'v1.0.0',
    serializer: `LCL_OBJECT_${type}`,
    serializer_version: 'v1.0.0',
    toAbapGit: (obj) => ({
      SKEY: { TYPE: type, NAME: String(obj?.name ?? '').toUpperCase() },
    }),
    getSource: affGetSource,
    fromAbapGit: ({ SKEY }) => affFromAbapGit(SKEY),
    fromAffJson: (json) =>
      options?.fromAffJsonExtra
        ? { ...affFromAffJson(json, ''), ...options.fromAffJsonExtra(json) }
        : affFromAffJson(json, ''),
    setSources: affSetSources,
    serialize: (object, ctx, opts?: FormatSerializeOptions) =>
      serializeDualFormat(object, ctx, opts, {
        typeLabel: type,
        sourceExt: 'acds',
        jsonExt: `${ctx.fileExtension}.json`,
        extra: options?.serializeExtra?.(object),
      }),
  });
}
