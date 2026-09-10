/**
 * DDLX (CDS Metadata Extension) object handler for abapGit format
 *
 * DDLX is source-driven: the semantic content lives in an `.acds` file.
 * Supports BOTH formats:
 *   - AFF (default): `.ddlx.acds` source + `.ddlx.json` metadata sidecar
 *   - Legacy XML:    `.ddlx.acds` source + `.ddlx.xml` metadata
 */

import { ddlx } from '../../../schemas/generated';
import { createCdsAffSourceHandler } from './cds-aff-source';

export const ddlExtensionHandler = createCdsAffSourceHandler('DDLX', {
  schema: ddlx,
});
