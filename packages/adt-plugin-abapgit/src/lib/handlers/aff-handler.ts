/**
 * Shared factory for AFF-first object handlers.
 *
 * The 17 AFF-first types (APLO, BGQC, CDBO, CHKC, CHKO, CHKV, COTA, EVTB,
 * GSMP, NONT, RONT, SAJC, SAJT, SMBC, UIAD, UIPG, UIST) all share the same
 * serialization logic — only the type code and file extension differ.
 * This factory eliminates the per-handler duplication.
 */

import { bdef } from '../../schemas/generated';
import { createHandler, type SerializedFile } from './base';
import { affFromAffJson } from './source-resolver';

type AffFirstLike = {
  name: string;
  description?: string;
  originalLanguage?: string;
};

/**
 * Create an AFF-first handler that serializes to JSON metadata only.
 *
 * @param type    ABAP object type code (e.g. 'APLO')
 * @param ext     Lowercase file extension for the JSON sidecar (e.g. 'aplo')
 */
export function createAffFirstHandler(type: string, ext: string) {
  return createHandler<AffFirstLike, typeof bdef>(type, {
    schema: bdef,
    version: 'v1.0.0',
    serializer: `LCL_OBJECT_${type}`,
    serializer_version: 'v1.0.0',
    toAbapGit: (obj) => ({
      SKEY: { TYPE: type, NAME: String(obj?.name ?? '').toUpperCase() },
    }),
    fromAffJson: (json) => affFromAffJson(json, ''),
    async serialize(object, ctx): Promise<SerializedFile[]> {
      const header = {
        description: object.description || String(object.name ?? ''),
        originalLanguage: (object.originalLanguage ?? 'en').toLowerCase(),
      };
      return [
        ctx.createFile(
          `${ctx.getObjectName(object)}.${ext}.json`,
          `${JSON.stringify({ formatVersion: '1', header }, null, 2)}\n`,
        ),
      ];
    },
  });
}
