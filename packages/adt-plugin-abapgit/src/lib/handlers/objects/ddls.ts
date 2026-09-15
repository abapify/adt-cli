/**
 * DDLS (Data Definition Language Source) object handler for abapGit format
 *
 * DDLS is source-driven: the semantic content lives in an `.acds` file.
 * Supports BOTH formats:
 *   - AFF (default): `.ddls.acds` source + `.ddls.json` metadata sidecar
 *   - Legacy XML:    `.ddls.acds` source + `.ddls.xml` metadata
 */

import { ddls } from '../../../schemas/generated';
import { createCdsAffSourceHandler } from './cds-aff-source';

export const ddlSourceHandler = createCdsAffSourceHandler('DDLS', {
  schema: ddls,
  fromAffJsonExtra: (json) => ({
    sourceOrigin: (json as { sourceOrigin?: string })?.sourceOrigin,
    sourceType: (json as { sourceType?: string })?.sourceType,
  }),
  serializeExtra: (object) => ({
    sourceOrigin: object.sourceOrigin ?? 'abapDevelopmentTools',
    sourceType: object.sourceType ?? 'unknown',
  }),
});
