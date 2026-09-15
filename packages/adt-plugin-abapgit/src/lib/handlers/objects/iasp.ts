/**
 * IASP (Archive Path / Service) handler for abapGit format
 */

import { iasp } from '../../../schemas/generated';
import { createArchiveHandler } from './archive';

export const archivePathHandler = createArchiveHandler('IASP', iasp);
