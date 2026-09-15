/**
 * DCLS (ABAP Data Control Language Source) object handler for abapGit format
 *
 * DCLS is source-driven: the semantic content lives in an `.acds` file.
 * Supports BOTH formats:
 *   - AFF (default): `.dcls.acds` source + `.dcls.json` metadata sidecar
 *   - Legacy XML:    `.dcls.acds` source + `.dcls.xml` metadata
 */

import { dcls } from '../../../schemas/generated';
import { createCdsAffSourceHandler } from './cds-aff-source';

export const dclSourceHandler = createCdsAffSourceHandler('DCLS', {
  schema: dcls,
});
