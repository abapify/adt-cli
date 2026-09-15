/**
 * SOD2 (ODS Object 2) handler for abapGit format
 */

import { sod2 } from '../../../schemas/generated';
import { createOdsHandler } from './sod';

export const odsObject2Handler = createOdsHandler('SOD2', sod2);
