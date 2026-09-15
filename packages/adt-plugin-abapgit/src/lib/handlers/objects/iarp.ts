/**
 * IARP (Archive Object) handler for abapGit format
 */

import { iarp } from '../../../schemas/generated';
import { createArchiveHandler } from './archive';

export const archiveObjectHandler = createArchiveHandler('IARP', iarp);
